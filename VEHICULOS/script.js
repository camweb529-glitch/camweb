
/* ==========================================
   CAMWEB - FLOTA DE VEHÍCULOS
   Vinculado con el Administrador
========================================== */

const CLAVE_VEHICULOS = "camwebVehiculos";
const CLAVE_LOGO = "camwebLogoEmpresa";
const CLAVE_NOMBRE_EMPRESA = "camwebNombreEmpresa";
const CLAVE_COLOR_EMPRESA = "camwebColorEmpresa";
const CLAVE_USUARIO_ADMINISTRADOR = "camwebUsuarioAdministrador";
const CLAVE_CONTRASENA_ADMINISTRADOR = "camwebContrasenaAdministrador";
const CLAVE_CLIENTES = "camwebClientesPorVehiculo";
const CLAVE_PRODUCCION = "camwebProduccionLeche";
const CLAVE_ORDEN_RUTA = "camwebOrdenRutaClientes";
const CLAVE_TEMPORAL_LECHE = "camwebRegistroTemporalLeche";
const CLAVE_PROVEEDORES_DESCARGA = "camwebProveedoresDescarga";
const CLAVE_REGISTROS_DESCARGA = "camwebRegistrosDescarga";
const CLAVE_SESIONES_CAMION = "camwebSesionesAccesoCamion";
const DURACION_SESION_CAMION = 3 * 60 * 60 * 1000;
const DURACION_TEMPORAL_LECHE = 20 * 60 * 60 * 1000;
let vehiculoRegistroActual = null;
let clienteSeleccionadoVoz = null;
let temporizadorExpiracionLeche = null;
const valoresTemporales = new Map();
const valoresTemporalesDescarga = new Map();
let proveedorDescargaFlota = null;
let vehiculoAccesoPendiente = null;

const URL_ADMINISTRADOR = "../administrador/index.html";

function mezclarColorFlota(color, mezcla, proporcion) {
    const canal = (hex, indice) => parseInt(hex.slice(indice, indice + 2), 16);
    const nuevoCanal = indice => Math.round(canal(color, indice) * (1 - proporcion) + canal(mezcla, indice) * proporcion).toString(16).padStart(2, "0");
    return `#${nuevoCanal(1)}${nuevoCanal(3)}${nuevoCanal(5)}`;
}

function aplicarColorEmpresaFlota() {
    const guardado = localStorage.getItem(CLAVE_COLOR_EMPRESA) || "#246b38";
    const color = /^#[0-9a-f]{6}$/i.test(guardado) ? guardado : "#246b38";
    const raiz = document.documentElement;
    raiz.style.setProperty("--verde-principal", color);
    raiz.style.setProperty("--verde-oscuro", mezclarColorFlota(color, "#000000", 0.25));
    raiz.style.setProperty("--verde-lateral", mezclarColorFlota(color, "#000000", 0.48));
    raiz.style.setProperty("--verde-medio", mezclarColorFlota(color, "#ffffff", 0.45));
    raiz.style.setProperty("--verde-claro", mezclarColorFlota(color, "#ffffff", 0.9));
    raiz.style.setProperty("--verde-fondo", mezclarColorFlota(color, "#ffffff", 0.86));
    raiz.style.setProperty("--borde", mezclarColorFlota(color, "#ffffff", 0.62));
}


/* ==========================================
   FUNCIONES AUXILIARES
========================================== */

function obtenerTexto(vehiculo, propiedades, valorPredeterminado = "") {
    for (const propiedad of propiedades) {
        const valor = vehiculo[propiedad];

        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
        ) {
            return String(valor).trim();
        }
    }

    return valorPredeterminado;
}


function obtenerVehiculosGuardados() {
    try {
        const datos = localStorage.getItem(CLAVE_VEHICULOS);

        if (!datos) {
            return [];
        }

        const vehiculos = JSON.parse(datos);

        return Array.isArray(vehiculos) ? vehiculos : [];

    } catch (error) {
        console.error("Error al leer los vehículos:", error);
        return [];
    }
}


function estaActivo(vehiculo) {
    if (vehiculo.activo === undefined || vehiculo.activo === null) {
        return true;
    }

    return (
        vehiculo.activo === true ||
        vehiculo.activo === 1 ||
        String(vehiculo.activo).toLowerCase() === "true" ||
        String(vehiculo.activo).toLowerCase() === "activo"
    );
}


function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);

    if (clase) {
        elemento.className = clase;
    }

    elemento.textContent = texto;

    return elemento;
}


/* ==========================================
   LOGO Y NOMBRE DE LA EMPRESA
========================================== */

function cargarDatosEmpresa() {
    const nombreEmpresa = document.getElementById("nombreEmpresa");
    const textoLogo = document.getElementById("textoLogo");
    const logoEmpresa = document.getElementById("logoEmpresa");

    try {
        const nombreGuardado = localStorage.getItem(CLAVE_NOMBRE_EMPRESA);
        const logoGuardado = localStorage.getItem(CLAVE_LOGO);

        /* CARGAR NOMBRE */

        if (nombreEmpresa) {
            nombreEmpresa.textContent =
                nombreGuardado && nombreGuardado.trim() !== ""
                    ? nombreGuardado
                    : "CAMWEB";
        }

        /* CARGAR LOGO */

        if (logoEmpresa && textoLogo) {
            if (logoGuardado && logoGuardado.trim() !== "") {
                logoEmpresa.onload = () => {
                    logoEmpresa.hidden = false;
                    textoLogo.hidden = true;
                };

                logoEmpresa.onerror = () => {
                    logoEmpresa.hidden = true;
                    textoLogo.hidden = false;
                    logoEmpresa.removeAttribute("src");
                };

                logoEmpresa.src = logoGuardado;

            } else {
                logoEmpresa.removeAttribute("src");
                logoEmpresa.hidden = true;
                textoLogo.hidden = false;
            }
        }

    } catch (error) {
        console.error("Error al cargar los datos de la empresa:", error);
    }
}


/* ==========================================
   NUMERACIÓN DE CAMIONES
========================================== */

function obtenerNumeroCamion(vehiculo, indice) {
    return String(Math.max(0, Number(indice) || 0) + 1);
}

/* ==========================================
   MOSTRAR VEHÍCULOS REGISTRADOS
========================================== */

function mostrarVehiculos() {
    const contenedor = document.getElementById("rejillaCarros");

    if (!contenedor) {
        console.error("No se encontró el contenedor rejillaCarros.");
        return;
    }

    const vehiculos = obtenerVehiculosGuardados();

    contenedor.innerHTML = "";

    if (vehiculos.length === 0) {
        contenedor.appendChild(
            crearElemento(
                "p",
                "mensaje-sin-vehiculos",
                "Todavía no hay vehículos registrados. Ingresa al Administrador para registrar el primer camión."
            )
        );

        return;
    }

    vehiculos.forEach((vehiculo, indice) => {
        const activo = estaActivo(vehiculo);
        const numero = obtenerNumeroCamion(vehiculo, indice);

        const chofer = obtenerTexto(
            vehiculo,
            ["chofer", "nombreChofer", "conductor", "nombreConductor"],
            "Chofer no registrado"
        );

        const ayudante1 = obtenerTexto(
            vehiculo,
            ["ayudante", "nombreAyudante", "ayudante1", "nombreAyudante1"]
        );

        const ayudante2 = obtenerTexto(
            vehiculo,
            ["ayudante2", "nombreAyudante2"]
        );

        const placa = obtenerTexto(
            vehiculo,
            ["placa", "placaVehiculo", "matricula"],
            "Sin placa"
        );

        const ruta = obtenerTexto(
            vehiculo,
            ["ruta", "rutaVehiculo", "nombreRuta"],
            "Ruta no registrada"
        );

        /* TARJETA */

        const tarjeta = document.createElement("article");

        tarjeta.className = activo
            ? "tarjeta-carro"
            : "tarjeta-carro inactivo";

        /* NÚMERO */

        tarjeta.appendChild(
            crearElemento(
                "div",
                "numero-carro",
                `CAMIÓN ${numero}`
            )
        );

        /* CAMIÓN */

        tarjeta.appendChild(
            crearElemento("div", "icono-carro", "🚚")
        );

        /* CHOFER */

        tarjeta.appendChild(
            crearElemento("div", "nombre-carro", chofer)
        );

        /* AYUDANTES */

        const ayudantes = [
            ayudante1,
            ayudante2
        ].filter(nombre => nombre !== "");

        tarjeta.appendChild(
            crearElemento(
                "div",
                "ayudantes-carro",
                ayudantes.length > 0
                    ? "Ayudantes: " + ayudantes.join(", ")
                    : "Sin ayudantes registrados"
            )
        );

        /* PLACA */

        tarjeta.appendChild(
            crearElemento(
                "div",
                "placa-carro",
                `Placa: ${placa}`
            )
        );

        /* RUTA */

        tarjeta.appendChild(
            crearElemento(
                "div",
                "nombre-ruta",
                `Ruta: ${ruta}`
            )
        );

        /* ESTADO */

        tarjeta.appendChild(
            crearElemento(
                "span",
                activo
                    ? "estado-carro estado-activo"
                    : "estado-carro estado-inactivo",
                activo ? "ACTIVO" : "INACTIVO"
            )
        );

        /* BOTÓN INGRESAR */

        const botonIngresar = crearElemento(
            "button",
            "boton-ingresar",
            activo ? "INGRESAR" : "INACTIVO"
        );

        botonIngresar.type = "button";
        botonIngresar.disabled = !activo;

        botonIngresar.setAttribute(
            "aria-label",
            `Ingresar al camión ${numero}`
        );

        botonIngresar.addEventListener("click", () => {
            if (activo) abrirAccesoCamion(vehiculo);
        });
        tarjeta.appendChild(botonIngresar);
        contenedor.appendChild(tarjeta);
    });
}



function abrirAccesoCamion(vehiculo) {
    if (tieneSesionActivaCamion(vehiculo)) {
        abrirRegistroLeche(vehiculo);
        return;
    }

    vehiculoAccesoPendiente = vehiculo;
    const fondo = document.getElementById("fondoAccesoCamion");
    const formulario = document.getElementById("formularioAccesoCamion");
    const nombre = document.getElementById("nombreAccesoCamion");
    const mensaje = document.getElementById("mensajeAccesoCamion");
    const usuario = document.getElementById("usuarioAccesoCamion");
    if (!fondo || !formulario) return;

    formulario.reset();
    const placa = obtenerTexto(vehiculo, ["placa", "placaVehiculo", "matricula"], "Sin placa");
    if (nombre) nombre.textContent = `${vehiculo.chofer || "Chofer"} · Placa ${placa}`;
    if (mensaje) mensaje.textContent = "Ingresa el usuario y la contraseña asignados a este camión.";
    fondo.hidden = false;
    usuario?.focus();
}

function leerSesionesCamion() {
    try {
        const sesiones = JSON.parse(localStorage.getItem(CLAVE_SESIONES_CAMION) || "{}");
        return sesiones && typeof sesiones === "object" && !Array.isArray(sesiones)
            ? sesiones
            : {};
    } catch {
        return {};
    }
}

function tieneSesionActivaCamion(vehiculo) {
    const sesiones = leerSesionesCamion();
    const id = String(vehiculo.id);
    const acceso = sesiones[id];
    const ingresado = Number(acceso?.ingresado);
    const transcurrido = Date.now() - ingresado;
    if (Number.isFinite(ingresado) && transcurrido >= 0 && transcurrido < DURACION_SESION_CAMION) {
        return true;
    }

    if (acceso) {
        delete sesiones[id];
        try { localStorage.setItem(CLAVE_SESIONES_CAMION, JSON.stringify(sesiones)); } catch {}
    }
    return false;
}

function guardarSesionCamion(vehiculo) {
    const sesiones = leerSesionesCamion();
    sesiones[String(vehiculo.id)] = { ingresado: Date.now() };
    localStorage.setItem(CLAVE_SESIONES_CAMION, JSON.stringify(sesiones));
}

function configurarAccesoCamion() {
    const fondo = document.getElementById("fondoAccesoCamion");
    const formulario = document.getElementById("formularioAccesoCamion");
    const campoUsuario = document.getElementById("usuarioAccesoCamion");
    const campoContrasena = document.getElementById("contrasenaAccesoCamion");
    const mensaje = document.getElementById("mensajeAccesoCamion");
    const cerrar = () => {
        if (fondo) fondo.hidden = true;
        if (formulario) formulario.reset();
        vehiculoAccesoPendiente = null;
    };

    document.getElementById("cancelarAccesoCamion")?.addEventListener("click", cerrar);
    fondo?.addEventListener("click", evento => {
        if (evento.target === fondo) cerrar();
    });
    formulario?.addEventListener("submit", evento => {
        evento.preventDefault();
        const vehiculo = vehiculoAccesoPendiente;
        if (!vehiculo) return;

        const usuarioGuardado = String(vehiculo.usuario || "").trim();
        const contrasenaGuardada = String(vehiculo.contrasena || "");
        if (!usuarioGuardado || !contrasenaGuardada) {
            if (mensaje) mensaje.textContent = "Este camión no tiene usuario y contraseña. Configúralos en Administrador > Vehículos > Editar camión.";
            return;
        }

        const usuarioIngresado = campoUsuario?.value.trim() || "";
        const contrasenaIngresada = campoContrasena?.value || "";
        if (usuarioIngresado !== usuarioGuardado || contrasenaIngresada !== contrasenaGuardada) {
            if (mensaje) mensaje.textContent = "Usuario o contraseña incorrectos. Inténtalo nuevamente.";
            campoContrasena?.select();
            return;
        }

        try {
            guardarSesionCamion(vehiculo);
        } catch (error) {
            console.error("No se pudo guardar la sesión del camión:", error);
        }
        cerrar();
        abrirRegistroLeche(vehiculo);
    });
}

function abrirRegistroLeche(vehiculo) {
    vehiculoRegistroActual = vehiculo;
    document.querySelector(".titulo-flota").hidden = true;
    document.getElementById("rejillaCarros").hidden = true;
    document.getElementById("panelRegistroLeche").hidden = false;
    document.getElementById("vistaClientesLeche").hidden = true;
    document.getElementById("vistaDescargaProducto").hidden = true;
    proveedorDescargaFlota = null;
    const placa = obtenerTexto(vehiculo, ["placa", "placaVehiculo", "matricula"], "Sin placa");
    const chofer = obtenerTexto(vehiculo, ["chofer", "nombreChofer", "conductor", "nombreConductor"], "No registrado");
    const vehiculosRegistrados = obtenerVehiculosGuardados();
    const indiceVehiculo = vehiculosRegistrados.findIndex(elemento => String(elemento.id) === String(vehiculo.id));
    const numero = obtenerNumeroCamion(vehiculo, indiceVehiculo >= 0 ? indiceVehiculo : 0);
    const ayudantes = ["ayudante", "nombreAyudante", "ayudante2", "nombreAyudante2"].map(k => vehiculo[k]).filter(Boolean);
    const ruta = obtenerTexto(vehiculo, ["ruta", "rutaVehiculo", "nombreRuta"], "Sin ruta");
    const linea = document.createElement("div");
    linea.className = "linea-datos-camion";
    const lineaCamion = document.createElement("div");
    lineaCamion.className = "identificador-camion-registro";
    lineaCamion.textContent = `Camión: ${numero}`;
    const lineaPersonal = document.createElement("div");
    lineaPersonal.className = "personal-camion-registro";
    lineaPersonal.textContent = `Chofer: ${chofer}${ayudantes.length ? " · Ayudante: " + ayudantes.join(", ") : " · Ayudante: Sin ayudante"} · Placa: ${placa}`;
    const lineaRuta = document.createElement("div");
    lineaRuta.className = "ruta-camion-registro";
    lineaRuta.textContent = `Ruta: ${ruta}`;
    linea.append(lineaCamion, lineaPersonal, lineaRuta);    const datos = document.getElementById("datosCamionRegistro");
    datos.replaceChildren(linea);    document.getElementById("buscarClienteLeche").value = "";
    mostrarClientesLeche();
}

function normalizarProduccionVehiculos(){const datos=leerObjeto(CLAVE_PRODUCCION);let cambio=false;for(const [llave,valor] of Object.entries(datos)){if(valor&&valor.periodo&&valor.litros&&!valor[valor.periodo]){datos[llave]={[valor.periodo]:valor};cambio=true;}}if(cambio)localStorage.setItem(CLAVE_PRODUCCION,JSON.stringify(datos));return datos;}
function leerObjeto(clave) { try { return JSON.parse(localStorage.getItem(clave) || "{}"); } catch { return {}; } }
function hoyISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function periodoDeHoy() { const d=new Date(), q=d.getDate()<=15?1:2, fin=q===1?15:new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); const iso=n=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(n).padStart(2,"0")}`; return {clave:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-Q${q}`,inicio:iso(q===1?1:16),fin:iso(fin)}; }
function mostrarClientesLeche() {
    if (!vehiculoRegistroActual) return;
    const clientes=leerObjeto(CLAVE_CLIENTES)[String(vehiculoRegistroActual.id)] || [];
    const q=(document.getElementById("buscarClienteLeche").value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
    const cont=document.getElementById("listaClientesLeche"); cont.replaceChildren();
    const fecha=hoyISO(), periodo=periodoDeHoy(), idv=String(vehiculoRegistroActual.id);
    const registros=normalizarProduccionVehiculos(), ordenes=leerObjeto(CLAVE_ORDEN_RUTA), temporales=leerObjeto(CLAVE_TEMPORAL_LECHE);
    let ruta=ordenes[idv] || {fecha,orden:clientes.map(c=>String(c.id)),secuencia:[]};
    if(ruta.fecha!==fecha){ ruta={fecha,orden:[...(ruta.secuencia||[]),...(ruta.orden||[]).filter(x=>!(ruta.secuencia||[]).includes(x))],secuencia:[]}; }
    clientes.forEach(c=>{if(!ruta.orden.includes(String(c.id))) ruta.orden.push(String(c.id));});
    ordenes[idv]=ruta; localStorage.setItem(CLAVE_ORDEN_RUTA,JSON.stringify(ordenes));
    const getRecord=c=>registros[`${idv}::${c.id}`]?.[periodo.clave];
    const pendiente=[],hechos=[];
    clientes.forEach((c,i)=>{const r=getRecord(c), tieneProduccion=r?.litros&&Object.prototype.hasOwnProperty.call(r.litros,fecha), t=temporales[`${idv}::${c.id}`], vigente=t&&t.fecha===fecha&&(Date.now()-Number(t.guardadoEn))<DURACION_TEMPORAL_LECHE; const saved=Boolean(tieneProduccion&&vigente); const row={c,i,saved,val:saved?r.litros[fecha]:""}; (saved?hechos:pendiente).push(row);});
    const pos=(id,list)=>{const n=list.indexOf(String(id));return n<0?99999:n;};
    pendiente.sort((a,b)=>pos(a.c.id,ruta.orden)-pos(b.c.id,ruta.orden)); hechos.sort((a,b)=>pos(a.c.id,ruta.secuencia)-pos(b.c.id,ruta.secuencia));
    [...pendiente,...hechos].filter(x=>x.c.nombre.toLowerCase().includes(q)).forEach(({c,saved,val})=>{
        const id=String(c.id), temporal=valoresTemporales.get(id); const fila=document.createElement("article"); fila.className="fila-cliente-flota"+(clienteSeleccionadoVoz===id?" cliente-seleccionado":"");
        const nombre=document.createElement("button"); nombre.type="button"; nombre.className="nombre-cliente-flota"; nombre.textContent=c.nombre; nombre.onclick=()=>{clienteSeleccionadoVoz=id;document.getElementById("estadoVozLeche").textContent=`Dicta los litros para ${c.nombre}; luego pulsa GUARDAR.`;mostrarClientesLeche();};
        const input=document.createElement("input"); input.type="number";input.min="0";input.step="0.01";input.placeholder="Litros";input.value=temporal!==undefined?temporal:(val===""?"":val);input.readOnly=saved&&!valoresTemporales.has(id);input.setAttribute("aria-label",`Litros de ${c.nombre}`);input.oninput=()=>valoresTemporales.set(id,input.value);
        const acciones=document.createElement("div");acciones.className="acciones-cliente-leche";
        const lapiz=document.createElement("button");lapiz.type="button";lapiz.className="boton-editar-leche";lapiz.textContent="\u270F\uFE0F";lapiz.title="Editar litros";lapiz.disabled=!saved||valoresTemporales.has(id);lapiz.onclick=()=>{valoresTemporales.set(id,String(val));mostrarClientesLeche();};
        const guardar=document.createElement("button");guardar.type="button";guardar.className="boton-guardar-leche";guardar.textContent="GUARDAR";guardar.disabled=input.value===""||(saved&&!valoresTemporales.has(id));guardar.onclick=()=>guardarLitros(c,input.value);
        input.addEventListener("input",()=>guardar.disabled=input.value===""); acciones.append(lapiz,guardar);fila.append(nombre,input,acciones);cont.append(fila);
    });
    if(!clientes.length){const e=document.createElement("p");e.className="mensaje-sin-vehiculos";e.textContent="Este camión todavía no tiene clientes registrados en Administrador.";cont.append(e);}
}
function guardarLitros(cliente, valor) {
    if(valor===""||!Number.isFinite(Number(valor))||Number(valor)<0)return;
    const fecha=hoyISO(), p=periodoDeHoy(), llave=`${vehiculoRegistroActual.id}::${cliente.id}`, datos=normalizarProduccionVehiculos();
    const periodos=datos[llave]||{}; const r=periodos[p.clave]||{periodo:p.clave,inicio:p.inicio,fin:p.fin,litros:{}};
    r.periodo=p.clave;r.inicio=p.inicio;r.fin=p.fin;r.litros=r.litros||{};r.litros[fecha]=Number(Number(valor).toFixed(2));r.registroPorFecha=r.registroPorFecha||{};r.registroPorFecha[fecha]=new Date().toISOString();r.guardado=new Date().toISOString();periodos[p.clave]=r;datos[llave]=periodos;localStorage.setItem(CLAVE_PRODUCCION,JSON.stringify(datos)); const temporales=leerObjeto(CLAVE_TEMPORAL_LECHE);temporales[llave]={fecha,guardadoEn:Date.now()};localStorage.setItem(CLAVE_TEMPORAL_LECHE,JSON.stringify(temporales));
    const ordenes=leerObjeto(CLAVE_ORDEN_RUTA),idv=String(vehiculoRegistroActual.id),ruta=ordenes[idv]||{fecha,orden:[],secuencia:[]};if(ruta.fecha!==fecha){ruta.fecha=fecha;ruta.secuencia=[];}ruta.secuencia=(ruta.secuencia||[]).filter(x=>x!==String(cliente.id));ruta.secuencia.push(String(cliente.id));ordenes[idv]=ruta;localStorage.setItem(CLAVE_ORDEN_RUTA,JSON.stringify(ordenes));valoresTemporales.delete(String(cliente.id));clienteSeleccionadoVoz=null;document.getElementById("estadoVozLeche").textContent="Registro guardado.";mostrarClientesLeche();
}
function iniciarMicrofonoLeche() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){document.getElementById("estadoVozLeche").textContent="El navegador no permite dictado por voz; escribe los litros manualmente.";return;}
    const reconocimiento=new SR();reconocimiento.lang="es-PE";reconocimiento.interimResults=false;reconocimiento.maxAlternatives=3;reconocimiento.onresult=e=>{const frase=e.results[0][0].transcript.trim();if(clienteSeleccionadoVoz){const n=interpretarLitros(frase);if(n!==null){valoresTemporales.set(clienteSeleccionadoVoz,String(n));mostrarClientesLeche();document.getElementById("estadoVozLeche").textContent=`Se reconoció ${n} litros. Pulsa GUARDAR para registrar.`;}else document.getElementById("estadoVozLeche").textContent="No reconocí la cantidad; intenta decir, por ejemplo, veinte litros y medio.";}else{document.getElementById("buscarClienteLeche").value=frase;mostrarClientesLeche();document.getElementById("estadoVozLeche").textContent="Selecciona el cliente encontrado y dicta sus litros.";}};reconocimiento.onerror=()=>document.getElementById("estadoVozLeche").textContent="No se pudo usar el micrófono. Revisa el permiso del navegador.";reconocimiento.start();document.getElementById("estadoVozLeche").textContent="Escuchando…";
}
function interpretarLitros(texto) {
    const t = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/,/g, ".").trim();
    const cifra = t.match(/\d+(?:\.\d+)?/);
    if (cifra) {
        let cantidad = Number(cifra[0]);
        if (/\bmedio\b|\bmedia\b|1\s*\/\s*2/.test(t) && Number.isInteger(cantidad)) cantidad += 0.5;
        if (/^\s*1\s*\/\s*2\b/.test(t)) cantidad = 0.5;
        return cantidad;
    }

    const palabras = t.replace(/\blitros?\b/g, " ").replace(/\by\b/g, " ").split(/\s+/).filter(Boolean);
    const unidades = {cero:0, un:1, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12, trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17, dieciocho:18, diecinueve:19, veinte:20, veintiuno:21, veintiun:21, veintiuna:21, veintidos:22, veintitres:23, veinticuatro:24, veinticinco:25, veintiseis:26, veintisiete:27, veintiocho:28, veintinueve:29};
    const decenas = {treinta:30, cuarenta:40, cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90};
    const centenas = {cien:100, ciento:100, doscientos:200, doscientas:200, trescientos:300, trescientas:300, cuatrocientos:400, cuatrocientas:400, quinientos:500, quinientas:500, seiscientos:600, seiscientas:600, setecientos:700, setecientas:700, ochocientos:800, ochocientas:800, novecientos:900, novecientas:900};
    let grupo = 0, total = 0, encontroNumero = false, medio = false;
    for (const palabra of palabras) {
        if (palabra === "medio" || palabra === "media") { medio = true; continue; }
        if (Object.prototype.hasOwnProperty.call(unidades, palabra)) { grupo += unidades[palabra]; encontroNumero = true; continue; }
        if (Object.prototype.hasOwnProperty.call(decenas, palabra)) { grupo += decenas[palabra]; encontroNumero = true; continue; }
        if (Object.prototype.hasOwnProperty.call(centenas, palabra)) { grupo += centenas[palabra]; encontroNumero = true; continue; }
        if (palabra === "mil") { total += (grupo || 1) * 1000; grupo = 0; encontroNumero = true; }
    }
    if (!encontroNumero && medio) grupo = /^medio\b/.test(t) ? 0 : (/\blitro\b/.test(t) ? 1 : 0);
    else if (!encontroNumero && /\blitro\b/.test(t)) grupo = 1;
    else if (!encontroNumero) return null;
    return total + grupo + (medio ? 0.5 : 0);
}
function leerProveedoresDescargaFlota(){try{const datos=JSON.parse(localStorage.getItem(CLAVE_PROVEEDORES_DESCARGA)||"[]");return Array.isArray(datos)?datos:[];}catch{return[];}}
function obtenerRegistrosDescargaFlota(){try{const datos=JSON.parse(localStorage.getItem(CLAVE_REGISTROS_DESCARGA)||"{}");return datos&&typeof datos==="object"&&!Array.isArray(datos)?datos:{};}catch{return{};}}
function mostrarProveedoresDescargaFlota(){
    const lista=document.getElementById("listaProveedoresFlota");
    lista.replaceChildren();
    const proveedores=leerProveedoresDescargaFlota();
    if(!proveedores.length){const vacio=document.createElement("p");vacio.className="mensaje-sin-vehiculos";vacio.textContent="Todavía no hay proveedores registrados.";lista.appendChild(vacio);return;}
    const fecha=hoyISO(),idCamion=String(vehiculoRegistroActual.id),registros=obtenerRegistrosDescargaFlota();
    proveedores.forEach(proveedor=>{
        const id=String(proveedor.id),registro=registros[id]?.[fecha];
        const guardado=registro&&typeof registro==="object"?registro[idCamion]:undefined;
        const temporal=valoresTemporalesDescarga.get(id);
        const fila=document.createElement("article");fila.className="fila-cliente-flota fila-proveedor-producto";
        const nombre=document.createElement("span");nombre.className="nombre-cliente-flota";nombre.textContent=proveedor.nombre;
        const input=document.createElement("input");input.type="number";input.min="0";input.step="0.01";input.inputMode="decimal";input.placeholder="Litros";input.value=temporal!==undefined?temporal:(guardado??"");input.readOnly=guardado!==undefined&&temporal===undefined;input.setAttribute("aria-label",`Litros descargados en ${proveedor.nombre}`);
        input.addEventListener("input",()=>{valoresTemporalesDescarga.set(id,input.value);guardar.disabled=input.value==="";});
        const acciones=document.createElement("div");acciones.className="acciones-cliente-leche";
        const lapiz=document.createElement("button");lapiz.type="button";lapiz.className="boton-editar-leche";lapiz.textContent="✏️";lapiz.title="Editar litros";lapiz.disabled=guardado===undefined||temporal!==undefined;lapiz.onclick=()=>{valoresTemporalesDescarga.set(id,String(guardado));mostrarProveedoresDescargaFlota();};
        const guardar=document.createElement("button");guardar.type="button";guardar.className="boton-guardar-leche";guardar.textContent="GUARDAR";guardar.disabled=input.value===""||(guardado!==undefined&&temporal===undefined);guardar.onclick=()=>guardarDescargaProductoFlota(proveedor,input.value);
        acciones.append(lapiz,guardar);fila.append(nombre,input,acciones);lista.appendChild(fila);
    });
}
function guardarDescargaProductoFlota(proveedor,valor){
    if(!vehiculoRegistroActual||valor===""||!Number.isFinite(Number(valor))||Number(valor)<0)return;
    const registros=obtenerRegistrosDescargaFlota(),idProveedor=String(proveedor.id),fecha=hoyISO(),idCamion=String(vehiculoRegistroActual.id);
    registros[idProveedor]=registros[idProveedor]||{};registros[idProveedor][fecha]=registros[idProveedor][fecha]&&typeof registros[idProveedor][fecha]==="object"?registros[idProveedor][fecha]:{};
    registros[idProveedor][fecha][idCamion]=Number(Number(valor).toFixed(2));delete registros[idProveedor][fecha].__total;
    try{localStorage.setItem(CLAVE_REGISTROS_DESCARGA,JSON.stringify(registros));valoresTemporalesDescarga.delete(idProveedor);mostrarProveedoresDescargaFlota();}catch(error){console.error("Error al guardar la descarga:",error);}
}
function configurarDescargaProductoFlota(){
    const botonLeche=document.getElementById("botonAbrirRegistroLeche"),botonProducto=document.getElementById("botonAbrirDescargaProducto"),vista=document.getElementById("vistaDescargaProducto"),vistaClientes=document.getElementById("vistaClientesLeche");
    botonLeche.addEventListener("click",()=>{vista.hidden=true;vistaClientes.hidden=false;document.getElementById("buscarClienteLeche").value="";mostrarClientesLeche();});
    botonProducto.addEventListener("click",()=>{vistaClientes.hidden=true;vista.hidden=false;mostrarProveedoresDescargaFlota();});
    window.addEventListener("storage",evento=>{if((evento.key===CLAVE_PROVEEDORES_DESCARGA||evento.key===null)&&!vista.hidden)mostrarProveedoresDescargaFlota();});
}
function configurarRegistroLeche(){document.getElementById("botonVolverFlota").onclick=()=>{document.getElementById("panelRegistroLeche").hidden=true;document.querySelector(".titulo-flota").hidden=false;document.getElementById("rejillaCarros").hidden=false;vehiculoRegistroActual=null;proveedorDescargaFlota=null;if(temporizadorExpiracionLeche)clearInterval(temporizadorExpiracionLeche);};document.getElementById("buscarClienteLeche").addEventListener("input",mostrarClientesLeche);document.getElementById("botonBuscarClienteLeche").onclick=mostrarClientesLeche;document.getElementById("botonMicrofonoLeche").onclick=iniciarMicrofonoLeche;configurarDescargaProductoFlota();}
/* ==========================================
   BOTÓN ADMIN
========================================== */

function configurarAdmin() {
    const boton = document.getElementById("botonAdmin");
    const fondo = document.getElementById("fondoAccesoAdmin");
    const formulario = document.getElementById("formularioAccesoAdmin");
    const campoUsuario = document.getElementById("usuarioAccesoAdmin");
    const campoContrasena = document.getElementById("contrasenaAccesoAdmin");
    const mensajeAcceso = document.getElementById("mensajeAccesoAdmin");
    const cerrarAcceso = () => {
        if (fondo) fondo.hidden = true;
        if (formulario) formulario.reset();
    };

    if (!boton) {
        console.error("No se encontró el botón botonAdmin.");
        return;
    }

    boton.addEventListener("click", () => {
        if (mensajeAcceso) {
            mensajeAcceso.textContent = "Ingresa tus credenciales de administrador configuradas en Ajustes.";
        }
        if (campoUsuario) campoUsuario.value = localStorage.getItem(CLAVE_USUARIO_ADMINISTRADOR) || "";
        if (fondo) fondo.hidden = false;
        campoUsuario?.focus();
    });

    document.getElementById("cancelarAccesoAdmin")?.addEventListener("click", cerrarAcceso);
    fondo?.addEventListener("click", evento => {
        if (evento.target === fondo) cerrarAcceso();
    });

    formulario?.addEventListener("submit", evento => {
        evento.preventDefault();
        const usuario = campoUsuario?.value.trim() || "";
        const contrasena = campoContrasena?.value || "";

        if (!window.camwebSupabase || !window.camwebAdministratorAuthEmail) {
            if (mensajeAcceso) mensajeAcceso.textContent = "No se pudo conectar con Supabase. Comprueba internet y vuelve a cargar Camweb.";
            return;
        }

        if (mensajeAcceso) mensajeAcceso.textContent = "Verificando tus credenciales…";
        const botonIngresar = formulario.querySelector('[type="submit"]');
        if (botonIngresar) botonIngresar.disabled = true;

        window.camwebSupabase.auth.signInWithPassword({
            email: window.camwebAdministratorAuthEmail,
            password: contrasena
        }).then(async ({ error }) => {
            if (error) throw error;

            const { data: { user }, error: userError } = await window.camwebSupabase.auth.getUser();
            if (userError) throw userError;
            const usuarioSupabase = user?.user_metadata?.camweb_username || "";

            if (usuarioSupabase && usuario !== usuarioSupabase) {
                await window.camwebSupabase.auth.signOut();
                throw new Error("CAMWEB_USERNAME_INVALID");
            }

            if (!usuarioSupabase) {
                const { error: metadataError } = await window.camwebSupabase.auth.updateUser({
                    data: { camweb_username: usuario }
                });
                if (metadataError) throw metadataError;
            }
            localStorage.setItem(CLAVE_USUARIO_ADMINISTRADOR, usuario);
            localStorage.removeItem(CLAVE_CONTRASENA_ADMINISTRADOR);
            sessionStorage.removeItem("camwebAccesoLocalTemporal");
            window.location.href = URL_ADMINISTRADOR;
        }).catch(error => {
            console.error("No se pudo verificar el acceso en Supabase:", error);
            if (mensajeAcceso) {
                mensajeAcceso.textContent = error?.message === "CAMWEB_USERNAME_INVALID"
                    ? "El usuario no coincide con el configurado en Supabase."
                    : "No se pudo iniciar sesión en Supabase. Revisa el usuario, la contraseña y la conexión; los datos no se cargarán sin verificar la cuenta.";
            }
            campoContrasena?.select();
        }).finally(() => {
            if (botonIngresar) botonIngresar.disabled = false;
        });
    });
}


/* ==========================================
   SINCRONIZAR CAMBIOS DEL ADMINISTRADOR
========================================== */

window.addEventListener("storage", (evento) => {
    if (
        evento.key === CLAVE_VEHICULOS ||
        evento.key === CLAVE_CLIENTES ||
        evento.key === CLAVE_LOGO ||
        evento.key === CLAVE_NOMBRE_EMPRESA ||
        evento.key === CLAVE_COLOR_EMPRESA ||
        evento.key === null
    ) {
        aplicarColorEmpresaFlota();
        cargarDatosEmpresa();
        mostrarVehiculos();
        if (vehiculoRegistroActual) mostrarClientesLeche();
    }
});

window.addEventListener("camweb:synced", () => {
    aplicarColorEmpresaFlota();
    cargarDatosEmpresa();
    mostrarVehiculos();
    if (vehiculoRegistroActual) mostrarClientesLeche();
});


/* ==========================================
   INICIAR APLICACIÓN
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    aplicarColorEmpresaFlota();
    cargarDatosEmpresa();
    mostrarVehiculos();
    configurarAdmin();
    configurarAccesoCamion();
    configurarRegistroLeche();
});

/* ==========================================
   RECUPERAR CONTRASEÑA DE SUPABASE AUTH
========================================== */

(function configurarRecuperacionSupabase() {
    if (!window.camwebSupabase) return;

    let panelAbierto = false;

    function mostrarPanelRecuperacion() {
        if (panelAbierto) return;
        panelAbierto = true;

        const panel = document.createElement("section");
        panel.id = "panelRecuperacionSupabase";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-labelledby", "tituloRecuperacionSupabase");
        panel.style.cssText = "position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:#0009;font-family:system-ui,sans-serif";
        panel.innerHTML = `
            <form id="formRecuperacionSupabase" style="width:min(420px,100%);padding:24px;background:#fff;border-radius:14px;box-shadow:0 18px 50px #0004;color:#183322">
                <h2 id="tituloRecuperacionSupabase" style="margin:0 0 8px">Crear contraseña nueva</h2>
                <p style="margin:0 0 18px">Elige una contraseña para el acceso de CAMWEB.</p>
                <label style="display:block;margin-bottom:12px">Nueva contraseña
                    <input id="nuevaContrasenaSupabase" type="password" autocomplete="new-password" minlength="8" required style="display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;border:1px solid #9aa99e;border-radius:7px">
                </label>
                <label style="display:block;margin-bottom:16px">Repite la contraseña
                    <input id="confirmarContrasenaSupabase" type="password" autocomplete="new-password" minlength="8" required style="display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:10px;border:1px solid #9aa99e;border-radius:7px">
                </label>
                <p id="mensajeRecuperacionSupabase" aria-live="polite" style="min-height:20px;margin:0 0 12px;color:#a12622"></p>
                <button type="submit" style="width:100%;padding:11px;border:0;border-radius:7px;background:#246b38;color:#fff;font-weight:700;cursor:pointer">Guardar contraseña</button>
            </form>`;
        document.body.appendChild(panel);

        const form = panel.querySelector("#formRecuperacionSupabase");
        const password = panel.querySelector("#nuevaContrasenaSupabase");
        const confirm = panel.querySelector("#confirmarContrasenaSupabase");
        const message = panel.querySelector("#mensajeRecuperacionSupabase");
        password.focus();

        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (password.value !== confirm.value) {
                message.textContent = "Las contraseñas no coinciden.";
                confirm.focus();
                return;
            }
            const button = form.querySelector("button[type='submit']");
            button.disabled = true;
            message.style.color = "#183322";
            message.textContent = "Guardando…";
            try {
                const { data: { session }, error: sessionError } = await window.camwebSupabase.auth.getSession();
                if (sessionError) throw sessionError;
                if (!session) throw new Error("El enlace venció o ya se usó. Solicita otro correo de recuperación.");
                const { error } = await window.camwebSupabase.auth.updateUser({ password: password.value });
                if (error) throw error;
                sessionStorage.removeItem("camwebAccesoLocalTemporal");
                await window.camwebSupabase.auth.signOut();
                message.style.color = "#246b38";
                message.textContent = "Contraseña actualizada. Ya puedes entrar a CAMWEB con ella.";
                password.value = "";
                confirm.value = "";
                button.textContent = "Ir al acceso de CAMWEB";
                button.disabled = false;
                button.type = "button";
                button.addEventListener("click", () => { window.location.href = "./index.html"; }, { once: true });
            } catch (error) {
                message.style.color = "#a12622";
                message.textContent = error.message || "No se pudo actualizar la contraseña.";
                button.disabled = false;
            }
        });
    }

    window.camwebSupabase.auth.onAuthStateChange(event => {
        if (event === "PASSWORD_RECOVERY") mostrarPanelRecuperacion();
    });

    if (window.location.hash.includes("type=recovery")) {
        window.camwebSupabase.auth.getSession().then(({ data, error }) => {
            if (!error && data.session) mostrarPanelRecuperacion();
        });
    }
})();
