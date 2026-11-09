/* Sincroniza el almacenamiento local existente con las tablas protegidas. */
(function () {
    const keys = {
        vehicles: "camwebVehiculos",
        clients: "camwebClientesPorVehiculo",
        production: "camwebProduccionLeche"
    };
    const privateOrTemporaryKeys = new Set([
        "camwebUsuarioAdministrador", "camwebContrasenaAdministrador",
        "camwebSesionesAccesoCamion", "camwebRegistroTemporalLeche",
        "camwebCredencialesVehiculos"
    ]);
    const originalSetItem = Storage.prototype.setItem;
    let updatingLocal = false;
    let saveTimer = null;

    function localJson(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key) || ""); }
        catch { return fallback; }
    }

    function vehicleRows(ownerId) {
        const vehicles = localJson(keys.vehicles, []);
        return (Array.isArray(vehicles) ? vehicles : []).map(v => ({
            id: String(v.id), propietario_id: ownerId,
            placa: v.placa || "", chofer: v.chofer || "",
            ayudantes: Array.isArray(v.ayudantes) ? v.ayudantes : (v.ayudante ? [v.ayudante] : []),
            ruta: v.ruta || "", activo: v.activo !== false
        }));
    }

    function clientRows(ownerId) {
        const groups = localJson(keys.clients, {});
        const rows = [];
        for (const [vehicleId, clients] of Object.entries(groups || {})) {
            for (const client of (Array.isArray(clients) ? clients : [])) {
                rows.push({
                    id: String(client.id), propietario_id: ownerId,
                    vehiculo_id: String(vehicleId),
                    nombre: client.nombre || "", precio: Number(client.precio) || 0,
                    activo: client.activo !== false,
                    creado_en: client.fechaRegistro || new Date().toISOString()
                });
            }
        }
        return rows;
    }

    function productionRows(ownerId) {
        const records = localJson(keys.production, {});
        const rows = [];
        for (const [compoundId, periods] of Object.entries(records || {})) {
            const split = compoundId.indexOf("::");
            if (split < 0) continue;
            const clientId = compoundId.slice(split + 2);
            for (const period of Object.values(periods || {})) {
                for (const [date, liters] of Object.entries(period?.litros || {})) {
                    rows.push({ propietario_id: ownerId, cliente_id: clientId, fecha: date, litros: Number(liters) || 0 });
                }
            }
        }
        return rows;
    }

    function otherDataRows(ownerId) {
        const localVehicles = localJson(keys.vehicles, []);
        const rows = Object.keys(localStorage)
            .filter(key => key.startsWith("camweb") &&
                !privateOrTemporaryKeys.has(key) && !Object.values(keys).includes(key))
            .map(clave => {
                const raw = localStorage.getItem(clave);
                let valor;
                try { valor = JSON.parse(raw); } catch { valor = raw; }
                return { propietario_id: ownerId, clave, valor, actualizado_en: new Date().toISOString() };
            });
        // Las credenciales de cada vehiculo se guardan en el registro privado
        // del propietario, protegido por RLS, y no en la tabla publica de flota.
        const credentials = Object.fromEntries((Array.isArray(localVehicles) ? localVehicles : [])
            .map(vehicle => {
                return [String(vehicle.id), { usuario: vehicle.usuario || "", contrasena: vehicle.contrasena || "" }];
            }));
        rows.push({ propietario_id: ownerId, clave: "camwebCredencialesVehiculos", valor: credentials, actualizado_en: new Date().toISOString() });
        return rows;
    }

    async function getClient() {
        if (!window.camwebSupabase) throw new Error("No se cargó Supabase.");
        const { data: { session }, error } = await window.camwebSupabase.auth.getSession();
        if (error) throw error;
        if (!session) throw new Error("Inicia sesión para sincronizar los datos.");
        if (!session.user?.id) throw new Error("No se pudo identificar al usuario de Supabase.");
        return { client: window.camwebSupabase, ownerId: session.user.id };
    }

    async function readTables(client) {
        const names = ["vehiculos", "clientes", "produccion_leche"];
        const responses = await Promise.all([
            ...names.map(name => client.from(name).select("*")),
            client.from("camweb_datos").select("clave,valor,actualizado_en")
        ]);
        const failure = responses.find(response => response.error);
        if (failure) throw failure.error;
        return {
            vehicles: responses[0].data || [],
            clients: responses[1].data || [],
            production: responses[2].data || [],
            other: responses[3].data || []
        };
    }

    async function saveLocalToRemote(client, ownerId) {
        const vehicles = vehicleRows(ownerId);
        const clients = clientRows(ownerId);
        const production = productionRows(ownerId);
        if (vehicles.length) {
            const { error } = await client.from("vehiculos").upsert(vehicles, { onConflict: "id" });
            if (error) throw error;
        }
        if (clients.length) {
            const { error } = await client.from("clientes").upsert(clients, { onConflict: "id" });
            if (error) throw error;
        }
        if (production.length) {
            const { error } = await client.from("produccion_leche").upsert(production, { onConflict: "cliente_id,fecha" });
            if (error) throw error;
        }
        const other = otherDataRows(ownerId);
        if (other.length) {
            const { error } = await client.from("camweb_datos").upsert(other, { onConflict: "propietario_id,clave" });
            if (error) throw error;
        }

        // Mantiene los historiales de produccion al retirar vehiculos o clientes.
        const remote = await readTables(client);
        const currentVehicleIds = new Set(vehicles.map(row => row.id));
        const removedVehicles = remote.vehicles.filter(row => row.activo && !currentVehicleIds.has(String(row.id)));
        for (const row of removedVehicles) {
            const { error } = await client.from("vehiculos").update({ activo: false }).eq("id", row.id);
            if (error) throw error;
        }
        const currentClientIds = new Set(clients.map(row => row.id));
        const removedClients = remote.clients.filter(row => row.activo && !currentClientIds.has(String(row.id)));
        for (const row of removedClients) {
            const { error } = await client.from("clientes").update({ activo: false }).eq("id", row.id);
            if (error) throw error;
        }
    }

    function writeLocal(key, value) {
        originalSetItem.call(localStorage, key, JSON.stringify(value));
    }

    function restoreRemoteTables(tables) {
        const { vehicles, clients, production, other } = tables;
        const previousVehicles = localJson(keys.vehicles, []);
        const credentialsById = new Map((Array.isArray(previousVehicles) ? previousVehicles : []).map(v => [String(v.id), v]));
        const remoteCredentials = other.find(row => row.clave === "camwebCredencialesVehiculos")?.valor || {};
        const vehicleList = vehicles.map(row => ({
            ...(credentialsById.get(String(row.id)) || {}), id: String(row.id), placa: row.placa,
            chofer: row.chofer, ayudantes: row.ayudantes || [], ayudante: row.ayudantes?.[0] || "",
            ruta: row.ruta, activo: row.activo, fechaRegistro: row.creado_en,
            ...(remoteCredentials[String(row.id)] || {})
        }));
        const vehicleByClient = new Map();
        const clientGroups = {};
        for (const row of clients) {
            const vehicleId = String(row.vehiculo_id);
            vehicleByClient.set(String(row.id), vehicleId);
            if (row.activo === false) continue;
            (clientGroups[vehicleId] ||= []).push({
                id: String(row.id), nombre: row.nombre, precio: Number(row.precio) || 0,
                activo: row.activo, fechaRegistro: row.creado_en
            });
        }
        const productionGroups = {};
        for (const row of production) {
            const vehicleId = vehicleByClient.get(String(row.cliente_id));
            if (!vehicleId) continue;
            const date = String(row.fecha).slice(0, 10);
            const day = Number(date.slice(8, 10));
            const yearMonth = date.slice(0, 7);
            const quarter = day <= 15 ? 1 : 2;
            const periodKey = `${yearMonth}-Q${quarter}`;
            const start = `${yearMonth}-${quarter === 1 ? "01" : "16"}`;
            const lastDay = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate();
            const end = `${yearMonth}-${String(quarter === 1 ? 15 : lastDay).padStart(2, "0")}`;
            const key = `${vehicleId}::${row.cliente_id}`;
            const period = (productionGroups[key] ||= {})[periodKey] ||= { periodo: periodKey, inicio: start, fin: end, litros: {} };
            period.litros[date] = Number(row.litros);
        }
        updatingLocal = true;
        try {
            writeLocal(keys.vehicles, vehicleList);
            writeLocal(keys.clients, clientGroups);
            writeLocal(keys.production, productionGroups);
            for (const row of other) {
                if (!privateOrTemporaryKeys.has(row.clave)) {
                    const value = typeof row.valor === "string"
                        ? row.valor
                        : JSON.stringify(row.valor);
                    originalSetItem.call(localStorage, row.clave, value);
                }
            }
        } finally { updatingLocal = false; }
    }

    async function syncInitial() {
        try {
            const { client, ownerId } = await getClient();
            const tables = await readTables(client);
            if (tables.vehicles.length === 0 && tables.clients.length === 0 &&
                tables.production.length === 0 && tables.other.length === 0) {
                await saveLocalToRemote(client, ownerId);
            } else {
                restoreRemoteTables(tables);
            }
            window.dispatchEvent(new Event("camweb:synced"));
        } catch (error) {
            window.dispatchEvent(new CustomEvent("camweb:sync-error", { detail: error.message }));
            throw error;
        }
    }

    async function queueSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            try {
                const { client, ownerId } = await getClient();
                await saveLocalToRemote(client, ownerId);
                window.dispatchEvent(new Event("camweb:saved"));
            } catch (error) {
                console.error("No se pudieron guardar los cambios en Supabase:", error);
                window.dispatchEvent(new CustomEvent("camweb:sync-error", { detail: error.message }));
            }
        }, 500);
    }

    Storage.prototype.setItem = function (key, value) {
        originalSetItem.call(this, key, value);
        if (!updatingLocal && (Object.values(keys).includes(key) || key.startsWith("camweb")) &&
            !privateOrTemporaryKeys.has(key)) queueSave();
    };

    async function saveNow() {
        const { client, ownerId } = await getClient();
        await saveLocalToRemote(client, ownerId);
        window.dispatchEvent(new Event("camweb:saved"));
    }

    window.camwebDataBridge = { syncInitial, saveNow };

    function showSyncNotice(message, isError) {
        let notice = document.getElementById("camwebSyncNotice");
        if (!notice) {
            notice = document.createElement("div");
            notice.id = "camwebSyncNotice";
            notice.setAttribute("role", "status");
            notice.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:99999;max-width:min(440px,calc(100vw - 32px));padding:12px 16px;border-radius:8px;color:#fff;font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px #0003";
            document.body.appendChild(notice);
        }
        notice.style.background = isError ? "#a12622" : "#246b38";
        notice.textContent = message;
        notice.hidden = false;
        clearTimeout(notice.hideTimer);
        if (!isError) notice.hideTimer = setTimeout(() => { notice.hidden = true; }, 3500);
    }

    window.addEventListener("camweb:sync-error", event => {
        showSyncNotice(`Error al sincronizar con Supabase: ${event.detail || "Error desconocido"}`, true);
    });
    window.addEventListener("camweb:synced", () => showSyncNotice("Datos cargados desde Supabase.", false));
    window.addEventListener("camweb:saved", () => showSyncNotice("Cambios guardados en Supabase.", false));

    document.addEventListener("DOMContentLoaded", async () => {
        // La flota tambien consulta los datos compartidos al abrirse, siempre
        // que haya una sesion ya iniciada en este navegador.
        if (!document.getElementById("rejillaCarros")) return;
        try {
            const { data: { session } } = await window.camwebSupabase.auth.getSession();
            if (!session) return;
            await syncInitial();
            window.mostrarVehiculos?.();
        } catch (error) {
            console.error("No se pudieron cargar los datos compartidos de Camweb:", error);
        }
    });
})();
