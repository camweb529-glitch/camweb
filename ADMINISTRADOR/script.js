/* =========================================================
   CAMWEB - JAVASCRIPT COMPLETO DEL ADMINISTRADOR
========================================================= */

"use strict";

/* =========================================================
   CONFIGURACIÓN Y ESTADO
========================================================= */

const CLAVE_VEHICULOS = "camwebVehiculos";
const CLAVE_LOGO = "camwebLogoEmpresa";
const CLAVE_NOMBRE = "camwebNombreEmpresa";
const CLAVE_USUARIO = "camwebUsuarioAdministrador";
const CLAVE_CONTRASENA = "camwebContrasenaAdministrador";
const CLAVE_COLOR_EMPRESA = "camwebColorEmpresa";
const CLAVE_CLIENTES_POR_VEHICULO = "camwebClientesPorVehiculo";
const CLAVE_CLIENTES_ARCHIVADOS_REPORTES = "camwebClientesArchivadosReportes";
const CLAVE_PRODUCCION = "camwebProduccionLeche";
const CLAVE_FINANZAS = "camwebFinanzasAdelantos";
const CLAVE_PROVEEDORES_DESCARGA = "camwebProveedoresDescarga";
const CLAVE_REGISTROS_DESCARGA = "camwebRegistrosDescarga";
const CLAVE_LIMPIEZA_FINANZAS_INICIAL = "camwebFinanzasSaldosInicializados";

const URL_FLOTA = "../vehiculos/index.html";

let logoTemporal = null;
let estadoSelectorColor = { h: 120, s: 0.5, v: 0.42 };

let vehiculoClientesActual = null;
let reconocimientoClientesAdmin = null;
let vozClientesActiva = false;

let vehiculoProduccionActual = null;
let reconocimientoProduccion = null;
let vozProduccionActiva = false;

let clienteProduccionActual = null;
let periodoProduccionSeleccionado = null;
let edicionProduccionActiva = false;

let vehiculoFinanzasActual = null;
let clienteFinanzasActual = null;
let adelantoFinanzasEnEdicion = null;
let adelantoFinanzasSeleccionadoId = null;
let modoEdicionDescuentosFinanzas = false;
let modoEdicionAdelantoFinanzas = false;
let reconocimientoVozFinanzas = null;
let vozFinanzasActiva = false;
let proveedorDescargaActual = null;
let edicionDescargaActiva = false;
let periodoDescargaSeleccionado = null;
let camionDescargaSeleccionado = null;
let vehiculoReporteActual = null;
let periodoArchivoSeleccionadoReportes = false;
let intervaloCambioPeriodoReportes = null;
let clienteTableroSeleccionado = null;

/* Copia temporal para poder cancelar una edición sin perder datos. */
let copiaEdicionProduccion = null;

function $id(id) {
    return document.getElementById(id);
}

function mezclarColorHex(color, colorMezcla, proporcion) {
    const canal = (hex, indice) => parseInt(hex.slice(indice, indice + 2), 16);
    const mezclarCanal = indice => Math.round(
        canal(color, indice) * (1 - proporcion) + canal(colorMezcla, indice) * proporcion
    ).toString(16).padStart(2, "0");
    return `#${mezclarCanal(1)}${mezclarCanal(3)}${mezclarCanal(5)}`;
}

function aplicarColorEmpresa(color = localStorage.getItem(CLAVE_COLOR_EMPRESA)) {
    const principal = /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#246b38";
    const raiz = document.documentElement;
    raiz.style.setProperty("--verde-principal", principal);
    raiz.style.setProperty("--verde-oscuro", mezclarColorHex(principal, "#000000", 0.25));
    raiz.style.setProperty("--verde-lateral", mezclarColorHex(principal, "#000000", 0.48));
    raiz.style.setProperty("--verde-encabezado", mezclarColorHex(principal, "#ffffff", 0.9));
    raiz.style.setProperty("--verde-fondo", mezclarColorHex(principal, "#ffffff", 0.86));
    raiz.style.setProperty("--borde", mezclarColorHex(principal, "#ffffff", 0.62));
    raiz.style.setProperty("--color-recibo", principal);
    raiz.style.setProperty("--color-recibo-claro", mezclarColorHex(principal, "#ffffff", 0.93));
    raiz.style.setProperty("--color-recibo-borde", mezclarColorHex(principal, "#ffffff", 0.72));
}

function mensaje(id, texto) {
    const campo = $id(id);
    if (campo) campo.textContent = texto;
}

/* =========================================================
   ALMACENAMIENTO DE VEHÍCULOS
========================================================= */

function leerVehiculos() {
    try {
        const datos = JSON.parse(
            localStorage.getItem(CLAVE_VEHICULOS) || "[]"
        );

        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        console.error("Error al leer vehículos:", error);
        return [];
    }
}

function guardarVehiculos(lista) {
    localStorage.setItem(CLAVE_VEHICULOS, JSON.stringify(lista));
}

/* =========================================================
   CLIENTES: ALMACENAMIENTO SEPARADO POR CAMIÓN
========================================================= */

function leerTodosLosClientesAdmin() {
    try {
        const datos = JSON.parse(
            localStorage.getItem(CLAVE_CLIENTES_POR_VEHICULO) || "{}"
        );

        return datos &&
            typeof datos === "object" &&
            !Array.isArray(datos)
            ? datos
            : {};
    } catch (error) {
        console.error("Error al leer clientes:", error);
        return {};
    }
}

function guardarTodosLosClientesAdmin(datos) {
    localStorage.setItem(
        CLAVE_CLIENTES_POR_VEHICULO,
        JSON.stringify(datos)
    );
}

function leerClientesDeVehiculo(idVehiculo) {
    const todos = leerTodosLosClientesAdmin();
    const lista = todos[String(idVehiculo)];

    return Array.isArray(lista) ? lista : [];
}

function guardarClientesDeVehiculo(idVehiculo, lista) {
    const todos = leerTodosLosClientesAdmin();
    todos[String(idVehiculo)] = lista;
    guardarTodosLosClientesAdmin(todos);
}

function leerClientesArchivadosReporte(idVehiculo) {
    try {
        const archivados = JSON.parse(localStorage.getItem(CLAVE_CLIENTES_ARCHIVADOS_REPORTES) || "{}");
        const lista = archivados && typeof archivados === "object" ? archivados[String(idVehiculo)] : null;
        return Array.isArray(lista) ? lista : [];
    } catch (error) {
        console.error("No se pudieron leer los clientes históricos de reportes:", error);
        return [];
    }
}

function archivarClienteParaReportes(idVehiculo, cliente) {
    const claveVehiculo = String(idVehiculo);
    const archivados = JSON.parse(localStorage.getItem(CLAVE_CLIENTES_ARCHIVADOS_REPORTES) || "{}");
    const lista = Array.isArray(archivados[claveVehiculo]) ? archivados[claveVehiculo] : [];
    if (lista.some(item => String(item.id) === String(cliente.id))) return;
    lista.push({ ...cliente, fechaRegistro: cliente.fechaRegistro || null, fechaRetiro: new Date().toISOString() });
    archivados[claveVehiculo] = lista;
    localStorage.setItem(CLAVE_CLIENTES_ARCHIVADOS_REPORTES, JSON.stringify(archivados));
}

function obtenerPrecioNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function formatearPrecio(valor) {
    return obtenerPrecioNumero(valor).toFixed(2);
}

function normalizarBusquedaAdmin(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

/* =========================================================
   SALIR Y REGRESAR A LA FLOTA
========================================================= */

function salirFlota() {
    const submenu = $id("submenu");
    if (submenu) submenu.hidden = true;

    cerrarVentana();

    if (document.referrer) {
        try {
            const paginaAnterior = new URL(
                document.referrer,
                window.location.href
            );

            const rutaAnterior = paginaAnterior.pathname.toLowerCase();

            if (
                rutaAnterior.endsWith("/flota/index.html") ||
                rutaAnterior.endsWith("/flota/") ||
                rutaAnterior.endsWith("/flota")
            ) {
                window.history.back();
                return;
            }
        } catch (error) {
            console.warn(
                "No se pudo identificar la página anterior.",
                error
            );
        }
    }

    window.location.href = new URL(
        URL_FLOTA,
        window.location.href
    ).href;
}

/* =========================================================
   AYUDANTES: COMPATIBILIDAD CON REGISTROS ANTERIORES
========================================================= */

function obtenerAyudantes(vehiculo) {
    if (Array.isArray(vehiculo.ayudantes)) {
        return vehiculo.ayudantes
            .map(nombre => String(nombre || "").trim())
            .filter(Boolean)
            .slice(0, 2);
    }

    const ayudanteAntiguo = String(
        vehiculo.ayudante || ""
    ).trim();

    return ayudanteAntiguo ? [ayudanteAntiguo] : [];
}

/* =========================================================
   VENTANAS
========================================================= */

function ocultarVistas() {
    [
        "vistaVehiculos",
        "vistaColor",
        "vistaLogo",
        "vistaNombre",
        "vistaUsuario",
        "vistaDashboard"
    ].forEach(id => {
        const vista = $id(id);
        if (vista) vista.hidden = true;
    });
}

function mostrarVentana(id, titulo) {
    const fondo = $id("fondoVentana");
    const vista = $id(id);
    const encabezado = $id("tituloVentana");

    if (!fondo || !vista || !encabezado) {
        console.error("No se encuentra la ventana:", id);
        return;
    }

    ocultarVistas();
    fondo.hidden = false;
    vista.hidden = false;
    encabezado.textContent = titulo;
}

function cerrarVentana() {
    const fondo = $id("fondoVentana");
    if (fondo) fondo.hidden = true;

    logoTemporal = null;

    const archivo = $id("archivoLogo");
    if (archivo) archivo.value = "";
}

/* =========================================================
   MENÚ LATERAL
========================================================= */

function alternarMenu() {
    const submenu = $id("submenu");
    if (!submenu) return;

    submenu.hidden = !submenu.hidden;
    const botonMenu = $id("botonMenu");
    if (botonMenu) botonMenu.setAttribute("aria-expanded", String(!submenu.hidden));
    if (!submenu.hidden) {
        const panelAjustes = $id("submenuAjustes");
        if (panelAjustes) panelAjustes.hidden = true;
        $id("botonAjustes")?.setAttribute("aria-expanded", "false");
    }
}

/* =========================================================
   REGISTRAR Y EDITAR CAMIONES
========================================================= */

function abrirVentanaVehiculos() {
    limpiarFormularioVehiculo();
    mostrarVentana("vistaVehiculos", "🚚 REGISTRAR CAMIÓN");
}

function limpiarFormularioVehiculo() {
    const formulario = $id("formularioVehiculo");
    if (formulario) formulario.reset();

    const contrasena = $id("contrasenaVehiculo");
    if (contrasena) contrasena.type = "password";
    const botonVer = $id("botonVerContrasenaVehiculo");
    if (botonVer) {
        botonVer.setAttribute("aria-label", "Mostrar contraseña");
        botonVer.title = "Mostrar contraseña";
    }

    if ($id("idVehiculo")) $id("idVehiculo").value = "";

    mensaje("mensajeVehiculo", "");
}

const formularioVehiculo = $id("formularioVehiculo");

if (formularioVehiculo) {
    formularioVehiculo.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        const idActual = $id("idVehiculo").value;
        const placa = $id("placaVehiculo")
            .value.trim().toUpperCase();
        const chofer = $id("nombreChofer").value.trim();

        const ayudantes = [
            $id("nombreAyudante").value.trim(),
            $id("nombreAyudante2").value.trim()
        ].filter(Boolean);

        const ruta = $id("rutaVehiculo").value.trim();
        const usuario = $id("usuarioVehiculo").value.trim();
        const contrasena = $id("contrasenaVehiculo").value;

        if (!placa || !chofer || !ruta || !usuario || !contrasena) {
            mensaje(
                "mensajeVehiculo",
                "Completa el chofer, la placa, la ruta, el usuario y la contraseña."
            );
            return;
        }

        const lista = leerVehiculos();

        const duplicado = lista.some(vehiculo =>
            String(vehiculo.placa || "")
                .trim()
                .toUpperCase() === placa &&
            String(vehiculo.id) !== String(idActual)
        );

        if (duplicado) {
            mensaje(
                "mensajeVehiculo",
                "Ya existe un camión con esa placa."
            );
            return;
        }

        try {
            if (idActual) {
                const indice = lista.findIndex(
                    vehiculo =>
                        String(vehiculo.id) === String(idActual)
                );

                if (indice < 0) {
                    mensaje("mensajeVehiculo", "No se encontró el camión.");
                    return;
                }

                const anterior = lista[indice];

                lista[indice] = {
                    ...anterior,
                    placa,
                    chofer,
                    ayudantes,
                    ayudante: ayudantes[0] || "",
                    ruta,
                    usuario,
                    contrasena,
                    activo: anterior.activo !== false
                };
            } else {
                lista.push({
                    id: String(Date.now()),
                    placa,
                    chofer,
                    ayudantes,
                    ayudante: ayudantes[0] || "",
                    ruta,
                    usuario,
                    contrasena,
                    activo: true,
                    fechaRegistro: new Date().toISOString()
                });
            }

            guardarVehiculos(lista);
            await window.camwebDataBridge?.saveNow?.();
            mostrarVehiculos();
            mostrarVehiculosClientes();
            mostrarVehiculosProduccion();
            actualizarDashboard();
            cerrarVentana();
            abrirSeccion("vehiculos");

        } catch (error) {
            console.error("Error al guardar el camión:", error);
            mensaje(
                "mensajeVehiculo",
                "No se pudo guardar. Revisa el almacenamiento disponible."
            );
        }
    });
}

function editarVehiculo(id) {
    const vehiculo = leerVehiculos().find(
        elemento => String(elemento.id) === String(id)
    );

    if (!vehiculo) {
        alert("No se encontró el camión.");
        return;
    }

    const ayudantes = obtenerAyudantes(vehiculo);

    $id("idVehiculo").value = vehiculo.id;
    $id("nombreChofer").value = vehiculo.chofer || "";
    $id("nombreAyudante").value = ayudantes[0] || "";
    $id("nombreAyudante2").value = ayudantes[1] || "";
    $id("placaVehiculo").value = vehiculo.placa || "";
    $id("rutaVehiculo").value = vehiculo.ruta || "";
    $id("usuarioVehiculo").value = vehiculo.usuario || "";
    $id("contrasenaVehiculo").value = vehiculo.contrasena || "";

    mensaje("mensajeVehiculo", "");
    mostrarVentana("vistaVehiculos", "✏️ EDITAR CAMIÓN");
}

/* =========================================================
   AJUSTES
========================================================= */

function abrirVentanaAjustes() {
    const submenu = $id("submenuAjustes");
    if (!submenu) return;
    submenu.hidden = !submenu.hidden;
    $id("botonAjustes")?.setAttribute("aria-expanded", String(!submenu.hidden));
    if (!submenu.hidden) {
        const menu = $id("submenu");
        if (menu) menu.hidden = true;
        $id("botonMenu")?.setAttribute("aria-expanded", "false");
    }
}

function abrirAjuste(opcion) {
    if (opcion === "menu") {
        cerrarVentana();
        const submenu = $id("submenuAjustes");
        if (submenu) submenu.hidden = false;
        $id("botonAjustes")?.setAttribute("aria-expanded", "true");
        return;
    }

    if (opcion === "color") {
        const campoColor = $id("colorEmpresaInput");
        if (campoColor) campoColor.value = localStorage.getItem(CLAVE_COLOR_EMPRESA) || "#246b38";
        mensaje("mensajeColor", "");
        mostrarVentana("vistaColor", "🎨 COLOR");
        inicializarSelectorColor(campoColor?.value || "#246b38");
        return;
    }

    if (opcion === "logo") {
        cargarLogoActual();

        if ($id("archivoLogo")) $id("archivoLogo").value = "";

        mensaje("mensajeLogo", "");
        logoTemporal = null;
        mostrarVentana("vistaLogo", "🖼️ SUBIR LOGO");
        return;
    }

    if (opcion === "nombre") {
        const campoNombre = $id("nombreEmpresaInput");

        if (campoNombre) {
            campoNombre.value =
                localStorage.getItem(CLAVE_NOMBRE) || "CAMWEB";
        }

        mensaje("mensajeNombre", "");
        mostrarVentana("vistaNombre", "🏢 TÍTULOS");
        return;
    }

    if (opcion === "usuario") {
        const campoUsuario = $id("usuarioAdministrador");
        const campoContrasena = $id("contrasenaAdministrador");

        if (campoUsuario) {
            campoUsuario.value =
                localStorage.getItem(CLAVE_USUARIO) || "";
        }

        if (campoContrasena) {
            // La contraseña vive en Supabase Auth; no se vuelve a mostrar ni
            // se conserva en texto legible en el navegador.
            campoContrasena.value = "";
            campoContrasena.type = "password";
        }
        const botonVerContrasena = $id("botonVerContrasenaAdministrador");
        if (botonVerContrasena) {
            botonVerContrasena.setAttribute("aria-label", "Mostrar contraseña");
            botonVerContrasena.title = "Mostrar contraseña";
        }

        mensaje("mensajeUsuario", "");
        mostrarVentana("vistaUsuario", "🔐 USUARIO Y CONTRASEÑA");
    }
}

const formularioColor = $id("formularioColor");

function limitarCanalColor(valor) {
    return Math.max(0, Math.min(255, Math.round(Number(valor) || 0)));
}

function rgbAEstadoColor(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const maximo = Math.max(r, g, b);
    const minimo = Math.min(r, g, b);
    const diferencia = maximo - minimo;
    let h = 0;
    if (diferencia) {
        if (maximo === r) h = 60 * (((g - b) / diferencia) % 6);
        else if (maximo === g) h = 60 * ((b - r) / diferencia + 2);
        else h = 60 * ((r - g) / diferencia + 4);
    }
    if (h < 0) h += 360;
    return { h, s: maximo === 0 ? 0 : diferencia / maximo, v: maximo };
}

function estadoColorARGB({ h, s, v }) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return rgb.map(canal => limitarCanalColor((canal + m) * 255));
}

function hexAColorRGB(hex) {
    const seguro = /^#[0-9a-f]{6}$/i.test(hex || "") ? hex : "#246b38";
    return [1, 3, 5].map(posicion => parseInt(seguro.slice(posicion, posicion + 2), 16));
}

function renderizarSelectorColor() {
    const [r, g, b] = estadoColorARGB(estadoSelectorColor);
    const hex = "#" + [r, g, b].map(canal => canal.toString(16).padStart(2, "0")).join("");
    const valorHex = $id("colorEmpresaInput");
    if (valorHex) valorHex.value = hex;
    const muestra = $id("muestraColorSeleccion");
    if (muestra) muestra.style.backgroundColor = hex;
    const area = $id("areaColorSeleccion");
    if (area) area.style.backgroundImage = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${estadoSelectorColor.h} 100% 50%))`;
    const indicador = $id("indicadorAreaColor");
    if (indicador) {
        indicador.style.left = `${estadoSelectorColor.s * 100}%`;
        indicador.style.top = `${(1 - estadoSelectorColor.v) * 100}%`;
    }
    const tono = $id("tonoColor");
    if (tono) tono.value = String(Math.round(estadoSelectorColor.h) % 360);
    [["valorRojoColor", r], ["valorVerdeColor", g], ["valorAzulColor", b]].forEach(([id, valor]) => {
        const campo = $id(id);
        if (campo) campo.value = String(valor);
    });
}

function inicializarSelectorColor(hex) {
    estadoSelectorColor = rgbAEstadoColor(...hexAColorRGB(hex));
    renderizarSelectorColor();
}

function actualizarAreaSelectorColor(evento) {
    const area = $id("areaColorSeleccion");
    if (!area) return;
    const rect = area.getBoundingClientRect();
    estadoSelectorColor.s = Math.max(0, Math.min(1, (evento.clientX - rect.left) / rect.width));
    estadoSelectorColor.v = 1 - Math.max(0, Math.min(1, (evento.clientY - rect.top) / rect.height));
    renderizarSelectorColor();
}

const areaSelectorColor = $id("areaColorSeleccion");
if (areaSelectorColor) {
    let arrastrandoColor = false;
    areaSelectorColor.addEventListener("pointerdown", evento => {
        arrastrandoColor = true;
        areaSelectorColor.setPointerCapture(evento.pointerId);
        actualizarAreaSelectorColor(evento);
    });
    areaSelectorColor.addEventListener("pointermove", evento => {
        if (arrastrandoColor) actualizarAreaSelectorColor(evento);
    });
    areaSelectorColor.addEventListener("pointerup", () => { arrastrandoColor = false; });
    areaSelectorColor.addEventListener("pointercancel", () => { arrastrandoColor = false; });
    areaSelectorColor.addEventListener("keydown", evento => {
        const paso = evento.shiftKey ? 0.1 : 0.02;
        if (evento.key === "ArrowLeft") estadoSelectorColor.s = Math.max(0, estadoSelectorColor.s - paso);
        else if (evento.key === "ArrowRight") estadoSelectorColor.s = Math.min(1, estadoSelectorColor.s + paso);
        else if (evento.key === "ArrowUp") estadoSelectorColor.v = Math.min(1, estadoSelectorColor.v + paso);
        else if (evento.key === "ArrowDown") estadoSelectorColor.v = Math.max(0, estadoSelectorColor.v - paso);
        else return;
        evento.preventDefault();
        renderizarSelectorColor();
    });
}

$id("tonoColor")?.addEventListener("input", evento => {
    estadoSelectorColor.h = Number(evento.target.value) || 0;
    renderizarSelectorColor();
});

["valorRojoColor", "valorVerdeColor", "valorAzulColor"].forEach(id => {
    $id(id)?.addEventListener("change", () => {
        const rgb = ["valorRojoColor", "valorVerdeColor", "valorAzulColor"].map(campoId =>
            limitarCanalColor($id(campoId)?.value)
        );
        estadoSelectorColor = rgbAEstadoColor(...rgb);
        renderizarSelectorColor();
    });
});

if (formularioColor) {
    formularioColor.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        const color = $id("colorEmpresaInput")?.value || "#246b38";
        try {
            localStorage.setItem(CLAVE_COLOR_EMPRESA, color);
            aplicarColorEmpresa(color);
            await window.camwebDataBridge?.saveNow?.();
            mensaje("mensajeColor", "Color guardado correctamente.");
        } catch (error) {
            console.error("Error al guardar el color:", error);
            mensaje("mensajeColor", "No se pudo guardar el color.");
        }
    });
}

/* =========================================================
   LOGO
========================================================= */

function cargarLogoActual() {
    const logo = localStorage.getItem(CLAVE_LOGO);
    const imagen = $id("vistaPreviaLogo");
    const texto = $id("textoVistaLogo");

    if (imagen && texto) {
        if (logo) {
            imagen.src = logo;
            imagen.hidden = false;
            texto.hidden = true;
        } else {
            imagen.removeAttribute("src");
            imagen.hidden = true;
            texto.hidden = false;
        }
    }

    actualizarEncabezado();
}

const archivoLogo = $id("archivoLogo");

if (archivoLogo) {
    archivoLogo.addEventListener("change", function () {
        const archivo = this.files && this.files[0];
        logoTemporal = null;

        if (!archivo) return;

        if (!archivo.type.startsWith("image/")) {
            mensaje("mensajeLogo", "Selecciona un archivo de imagen.");
            this.value = "";
            return;
        }

        if (archivo.size > 2 * 1024 * 1024) {
            mensaje(
                "mensajeLogo",
                "La imagen original no debe superar los 2 MB."
            );
            this.value = "";
            return;
        }

        const lector = new FileReader();

        lector.onload = function () {
            logoTemporal = lector.result;

            const vistaPrevia = $id("vistaPreviaLogo");
            const texto = $id("textoVistaLogo");

            if (vistaPrevia) {
                vistaPrevia.src = logoTemporal;
                vistaPrevia.hidden = false;
            }

            if (texto) texto.hidden = true;

            mensaje(
                "mensajeLogo",
                "Imagen seleccionada. Pulsa GUARDAR."
            );
        };

        lector.onerror = function () {
            mensaje("mensajeLogo", "No se pudo leer la imagen.");
        };

        lector.readAsDataURL(archivo);
    });
}

const formularioLogo = $id("formularioLogo");

if (formularioLogo) {
    formularioLogo.addEventListener("submit", function (evento) {
        evento.preventDefault();

        if (!logoTemporal) {
            mensaje("mensajeLogo", "Primero selecciona una fotografía.");
            return;
        }

        try {
            localStorage.setItem(CLAVE_LOGO, logoTemporal);
            actualizarEncabezado();
            cargarLogoActual();

            if ($id("archivoLogo")) $id("archivoLogo").value = "";

            logoTemporal = null;
            mensaje("mensajeLogo", "Logo guardado correctamente.");

        } catch (error) {
            console.error("Error al guardar el logo:", error);
            mensaje(
                "mensajeLogo",
                "No se pudo guardar. Prueba con una imagen más pequeña."
            );
        }
    });
}

/* =========================================================
   NOMBRE DE LA EMPRESA
========================================================= */

const formularioNombre = $id("formularioNombre");

if (formularioNombre) {
    formularioNombre.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        const nombre = $id("nombreEmpresaInput")?.value.trim() || "";

        if (!nombre) {
            mensaje("mensajeNombre", "Escribe el nombre de la empresa.");
            return;
        }

        try {
            localStorage.setItem(CLAVE_NOMBRE, nombre);
            actualizarEncabezado();
            await window.camwebDataBridge?.saveNow?.();
            mensaje("mensajeNombre", "Nombre guardado correctamente.");
        } catch (error) {
            console.error("Error al guardar el nombre:", error);
            mensaje("mensajeNombre", "No se pudo guardar el nombre.");
        }
    });
}

/* =========================================================
   USUARIO Y CONTRASEÑA
========================================================= */

const formularioUsuario = $id("formularioUsuario");

if (formularioUsuario) {
    formularioUsuario.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        const usuario = $id("usuarioAdministrador")?.value.trim() || "";
        const contrasena = $id("contrasenaAdministrador")?.value || "";

        if (!usuario) {
            mensaje("mensajeUsuario", "Escribe un nombre de usuario.");
            return;
        }

        const botonGuardar = formularioUsuario.querySelector('[type="submit"]');
        if (botonGuardar) botonGuardar.disabled = true;
        mensaje("mensajeUsuario", "Guardando credenciales…");

        try {
            // El usuario se guarda en los metadatos de Supabase para que el
            // cambio funcione tambien desde otros navegadores o dispositivos.
            if (!window.camwebSupabase) throw new Error("No se pudo cargar Supabase.");
            const { data: { session }, error: sessionError } = await window.camwebSupabase.auth.getSession();
            if (sessionError) throw sessionError;

            if (!session) throw new Error("Inicia sesión en Supabase antes de guardar las credenciales.");

            const cambiosUsuario = { data: { camweb_username: usuario } };
            if (contrasena.trim() !== "") cambiosUsuario.password = contrasena;
            const { error: updateError } = await window.camwebSupabase.auth.updateUser(cambiosUsuario);
            if (updateError) throw updateError;

            localStorage.setItem(CLAVE_USUARIO, usuario);
            localStorage.removeItem(CLAVE_CONTRASENA);
            if ($id("contrasenaAdministrador")) $id("contrasenaAdministrador").value = "";
            mensaje("mensajeUsuario", contrasena.trim() !== ""
                ? "Usuario y contraseña actualizados en Supabase."
                : "Usuario actualizado en Supabase.");
        } catch (error) {
            console.error("Error al actualizar las credenciales:", error);
            mensaje("mensajeUsuario", error.message || "No se pudieron actualizar las credenciales.");
        } finally {
            if (botonGuardar) botonGuardar.disabled = false;
        }
    });
}

/* =========================================================
   NAVEGACIÓN CENTRAL
========================================================= */

function leerProveedoresDescarga() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_PROVEEDORES_DESCARGA) || "[]");
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        console.error("Error al leer los proveedores:", error);
        return [];
    }
}

function mostrarProveedoresDescarga() {
    const lista = $id("listaProveedoresDescarga");
    const resumen = $id("listaProveedoresResumenDescarga");
    const proveedores = leerProveedoresDescarga();
    const consulta = normalizarBusquedaAdmin($id("buscarProveedorDescarga")?.value || "");
    const filtrados = proveedores.filter(proveedor => normalizarBusquedaAdmin(proveedor.nombre).includes(consulta));
    if (resumen) {
        resumen.replaceChildren();
        const total = $id("totalProveedoresDescarga");
        if (total) total.textContent = `${filtrados.length} ${filtrados.length === 1 ? "proveedor" : "proveedores"}`;
        if (!filtrados.length) {
            const vacio = document.createElement("p");
            vacio.className = "lista-clientes-vacia";
            vacio.textContent = proveedores.length ? "No se encontraron proveedores con esa búsqueda." : "Todavía no hay proveedores registrados.";
            resumen.appendChild(vacio);
        } else {
            filtrados.forEach(proveedor => {
                const fila = document.createElement("article");
                fila.className = "fila-cliente-admin fila-proveedor-resumen-descarga";
                const datos = document.createElement("div");
                datos.className = "datos-fila-cliente";
                const nombre = document.createElement("button");
                nombre.type = "button";
                nombre.className = "nombre-fila-cliente boton-nombre-proveedor-descarga";
                nombre.textContent = proveedor.nombre;
                nombre.addEventListener("click", () => abrirRegistroDescargaProveedor(proveedor.id));
                const precio = document.createElement("p");
                precio.className = "precio-fila-cliente";
                precio.textContent = `Precio: S/ ${Number(proveedor.precio).toFixed(2)}`;
                datos.append(nombre, precio);
                const totalLitros = document.createElement("strong");
                totalLitros.className = "total-litros-proveedor-resumen";
                const registrosProveedor = leerRegistrosDescarga()[String(proveedor.id)] || {};
                const total = Object.keys(registrosProveedor).reduce((suma, fecha) => {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return suma;
                    const litros = Number(litrosDescargadosEnFecha(registrosProveedor, fecha));
                    return suma + (Number.isFinite(litros) && litros > 0 ? litros : 0);
                }, 0);
                totalLitros.textContent = `${formatearLitros(total)} L`;
                totalLitros.setAttribute("aria-label", `Total descargado: ${formatearLitros(total)} litros`);
                fila.append(datos, totalLitros);
                resumen.appendChild(fila);
            });
        }
    }
    if (!lista) return;
    lista.replaceChildren();
    proveedores.forEach(proveedor => {
        const fila = document.createElement("article");
        fila.className = "fila-proveedor-descarga";
        const datos = document.createElement("div");
        const nombre = document.createElement("h3");
        nombre.className = "nombre-proveedor-descarga";
        nombre.textContent = proveedor.nombre;
        const precio = document.createElement("p");
        precio.className = "precio-proveedor-descarga";
        precio.textContent = `Precio: S/ ${Number(proveedor.precio).toFixed(2)}`;
        datos.append(nombre, precio);
        const acciones = document.createElement("div");
        acciones.className = "acciones-proveedor-descarga";
        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "boton-editar-proveedor";
        editar.textContent = "✏️";
        editar.title = "Editar proveedor";
        editar.setAttribute("aria-label", `Editar ${proveedor.nombre}`);
        editar.addEventListener("click", () => editarProveedorDescarga(proveedor.id));
        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.className = "boton-eliminar-proveedor";
        eliminar.textContent = "🗑️";
        eliminar.title = "Eliminar proveedor";
        eliminar.setAttribute("aria-label", `Eliminar ${proveedor.nombre}`);
        eliminar.addEventListener("click", () => eliminarProveedorDescarga(proveedor.id));
        acciones.append(editar, eliminar);
        fila.append(datos, acciones);
        lista.appendChild(fila);
    });
    if (!lista.childElementCount) {
        const vacio = document.createElement("p");
        vacio.className = "proveedores-descarga-vacio";
        vacio.textContent = "Todavía no hay proveedores registrados.";
        lista.appendChild(vacio);
    }
}

function editarProveedorDescarga(id) {
    const proveedor = leerProveedoresDescarga().find(item => String(item.id) === String(id));
    if (!proveedor) return;
    $id("panelProveedoresDescarga").hidden = false;
    $id("idProveedorDescarga").value = proveedor.id;
    $id("nombreProveedorDescarga").value = proveedor.nombre;
    $id("precioProveedorDescarga").value = proveedor.precio;
    $id("botonGuardarProveedor").textContent = "GUARDAR CAMBIOS";
    $id("botonCancelarProveedor").hidden = false;
    $id("mensajeProveedorDescarga").textContent = "Editando proveedor.";
    $id("nombreProveedorDescarga").focus();
}

function cancelarEdicionProveedorDescarga() {
    $id("formularioProveedorDescarga").reset();
    $id("idProveedorDescarga").value = "";
    $id("botonGuardarProveedor").textContent = "GUARDAR";
    $id("botonCancelarProveedor").hidden = true;
    $id("mensajeProveedorDescarga").textContent = "";
}

function eliminarProveedorDescarga(id) {
    const proveedores = leerProveedoresDescarga();
    const proveedor = proveedores.find(item => String(item.id) === String(id));
    if (!proveedor || !confirm(`¿Eliminar al proveedor ${proveedor.nombre}?`)) return;
    localStorage.setItem(CLAVE_PROVEEDORES_DESCARGA, JSON.stringify(proveedores.filter(item => String(item.id) !== String(id))));
    mostrarProveedoresDescarga();
    if ($id("idProveedorDescarga").value === String(id)) cancelarEdicionProveedorDescarga();
}

function leerRegistrosDescarga() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_REGISTROS_DESCARGA) || "{}");
        return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
    } catch (error) {
        console.error("Error al leer los registros de descarga:", error);
        return {};
    }
}

function abrirRegistroDescargaProveedor(id) {
    const proveedor = leerProveedoresDescarga().find(item => String(item.id) === String(id));
    if (!proveedor) return;
    proveedorDescargaActual = proveedor;
    $id("botonProveedorDescarga").hidden = true;
    $id("botonMicrofonoProveedores").closest(".zona-busqueda-proveedores").hidden = true;
    document.querySelector(".encabezado-lista-proveedores-descarga").hidden = true;
    $id("listaProveedoresResumenDescarga").hidden = true;
    $id("panelProveedoresDescarga").hidden = true;
    $id("panelRegistroDescargaProveedor").hidden = false;
    $id("nombreProveedorResumenDescarga").textContent = proveedor.nombre;
    $id("precioProveedorResumenDescarga").textContent = `Precio de compra: S/ ${Number(proveedor.precio).toFixed(2)} por litro`;
    edicionDescargaActiva = false;
    mensaje("mensajeDescargaProveedor", "");
    renderizarRegistroDescargaProveedor();
}

function clavesPeriodosDescarga(datosProveedor) {
    const periodos = new Set([obtenerPeriodoActual()]);
    Object.keys(datosProveedor || {}).forEach(fecha => {
        const partes = fecha.split("-").map(Number);
        if (partes.length !== 3 || !partes.every(Number.isFinite)) return;
        periodos.add(crearClavePeriodoProduccion(partes[0], partes[1], partes[2] <= 15 ? 1 : 2));
    });
    return [...periodos].sort().reverse();
}

function litrosDescargadosEnFecha(datosProveedor, fecha, idCamion) {
    const valor = datosProveedor?.[fecha];
    if (valor && typeof valor === "object") {
        if (idCamion !== undefined && idCamion !== null) {
            const cantidad = Number(valor[String(idCamion)]);
            return Number.isFinite(cantidad) && cantidad >= 0 ? cantidad : "";
        }
        const cantidadesPorCamion = Object.entries(valor).filter(([id]) => id !== "__total");
        if (cantidadesPorCamion.length) {
            return cantidadesPorCamion.reduce((total, [, cantidad]) => {
                const litros = Number(cantidad);
                return total + (Number.isFinite(litros) && litros >= 0 ? litros : 0);
            }, 0);
        }
        return "";
    }
    return Number.isFinite(Number(valor)) ? valor : "";
}

function crearTablaDescargaQuincena(clavePeriodo, datosProveedor, historica) {
    const periodo = datosPeriodoDesdeClave(clavePeriodo);
    const tarjeta = document.createElement("section");
    tarjeta.className = "tarjeta-quincena-produccion" + (historica ? " quincena-historica" : " quincena-seleccionada");
    tarjeta.dataset.periodo = clavePeriodo;
    const encabezado = document.createElement("div");
    encabezado.className = "encabezado-tabla-quincena";
    const mes = document.createElement("span");
    mes.className = "mes-encabezado-quincena";
    mes.textContent = `${NOMBRES_MESES[periodo.mes - 1].toUpperCase()} ${periodo.anio}`;
    const quincena = document.createElement("span");
    quincena.className = "nombre-encabezado-quincena";
    quincena.textContent = `${periodo.quincena === 1 ? "PRIMERA" : "SEGUNDA"} QUINCENA`;
    encabezado.append(mes, quincena);
    tarjeta.appendChild(encabezado);
    const scroll = document.createElement("div");
    scroll.className = "tabla-dias-scroll";
    const tabla = document.createElement("div");
    tabla.className = "rejilla-dias-produccion";
    tabla.style.gridTemplateColumns = "repeat(8, minmax(0, 1fr))";
    tabla.style.minWidth = "0";
    const inicio = periodo.quincena === 1 ? 1 : 16;
    const fin = periodo.quincena === 1 ? 15 : periodo.fin.getDate();
    for (let dia = inicio; dia <= fin; dia++) {
            const fecha = fechaLocalISO(new Date(periodo.anio, periodo.mes - 1, dia, 12));
            const fechaObj = new Date(periodo.anio, periodo.mes - 1, dia, 12);
            const celda = document.createElement("div");
            celda.className = "casilla-dia-produccion";
            const head = document.createElement("div");
            head.className = "encabezado-dia-produccion";
            const diaNumero = document.createElement("strong");
            diaNumero.className = "numero-dia-produccion";
            diaNumero.textContent = String(dia);
            const diaNombre = document.createElement("span");
            diaNombre.className = "nombre-dia-produccion";
            diaNombre.textContent = new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(fechaObj).replace(".", "");
            head.append(diaNumero, diaNombre);
            const entrada = document.createElement("input");
            entrada.type = "number";
            entrada.min = "0";
            entrada.step = "0.01";
            entrada.inputMode = "decimal";
            entrada.className = "entrada-litros-produccion entrada-litros-descarga-quincena";
            entrada.placeholder = "L";
            entrada.dataset.fecha = fecha;
            entrada.dataset.camion = String(camionDescargaSeleccionado || "");
            entrada.value = litrosDescargadosEnFecha(datosProveedor, fecha, camionDescargaSeleccionado);
            entrada.disabled = historica || !edicionDescargaActiva;
            entrada.setAttribute("aria-label", `${fecha}, litros descargados`);
            entrada.addEventListener("input", actualizarTotalQuincenaDescarga);
            celda.append(head, entrada);
            tabla.appendChild(celda);
    }
    scroll.appendChild(tabla);
    tarjeta.appendChild(scroll);
    return tarjeta;
}

function renderizarRegistroDescargaProveedor() {
    if (!proveedorDescargaActual) return;
    const idProveedor = String(proveedorDescargaActual.id);
    const registros = leerRegistrosDescarga();
    const datosProveedor = registros[idProveedor] || {};
    const selectorCamion = $id("camionDescargaSeleccionado");
    const camiones = leerVehiculos();
    const idPrevio = camionDescargaSeleccionado;
    selectorCamion?.replaceChildren(...camiones.map((camion, indice) => new Option(`Camión ${indice + 1} · ${camion.placa || "Sin placa"}`, String(camion.id))));
    camionDescargaSeleccionado = camiones.some(camion => String(camion.id) === String(idPrevio))
        ? String(idPrevio)
        : String(camiones[0]?.id || "");
    if (selectorCamion) {
        selectorCamion.value = camionDescargaSeleccionado;
        selectorCamion.disabled = edicionDescargaActiva || camiones.length === 0;
    }
    const actual = obtenerPeriodoActual();
    if (periodoDescargaSeleccionado !== actual) {
        periodoDescargaSeleccionado = actual;
        edicionDescargaActiva = false;
    }
    renderizarCamionesResumenDescarga(datosProveedor, actual);
    const contenedor = $id("contenedorTablasDescarga");
    contenedor.replaceChildren();
    contenedor.appendChild(crearTablaDescargaQuincena(actual, datosProveedor, false));
    const inicioActual = datosPeriodoDesdeClave(actual).inicio;
    const periodosAnteriores = clavesPeriodosDescarga(datosProveedor).filter(clave => {
        if (clave === actual) return false;
        const periodo = datosPeriodoDesdeClave(clave);
        if (!periodo || periodo.fin >= inicioActual) return false;
        return fechasPeriodoDescarga(periodo).some(fecha => litrosDescargadosEnFecha(datosProveedor, fecha) !== "");
    });
    const historial = $id("historialDescargaProveedor");
    const listaHistorial = $id("contenedorHistorialDescarga");
    listaHistorial.replaceChildren();
    historial.hidden = !periodosAnteriores.length;
    periodosAnteriores.forEach(periodo => listaHistorial.appendChild(crearTablaDescargaQuincena(periodo, datosProveedor, true)));
    $id("periodoTotalDescargaProveedor").textContent = datosPeriodoDesdeClave(actual).etiqueta;
    actualizarTotalQuincenaDescarga();
    $id("botonEditarDescargaProveedor").textContent = edicionDescargaActiva ? "✖️" : "✏️";
    $id("botonEditarDescargaProveedor").title = edicionDescargaActiva ? "Cancelar edición" : "Editar descarga";
    $id("botonGuardarDescargaProveedor").disabled = !edicionDescargaActiva;
}

function fechasPeriodoDescarga(periodo) {
    const inicio = periodo.quincena === 1 ? 1 : 16;
    const fin = periodo.quincena === 1 ? 15 : periodo.fin.getDate();
    return Array.from({ length: fin - inicio + 1 }, (_, indice) =>
        fechaLocalISO(new Date(periodo.anio, periodo.mes - 1, inicio + indice, 12))
    );
}

function renderizarCamionesResumenDescarga(datosProveedor, clavePeriodo) {
    const lista = $id("listaCamionesResumenDescarga");
    if (!lista) return;
    lista.replaceChildren();
    const periodo = datosPeriodoDesdeClave(clavePeriodo);
    const inicio = periodo.quincena === 1 ? 1 : 16;
    const fin = periodo.quincena === 1 ? 15 : periodo.fin.getDate();
    const fechas = Array.from({ length: fin - inicio + 1 }, (_, indice) =>
        fechaLocalISO(new Date(periodo.anio, periodo.mes - 1, inicio + indice, 12))
    );
    const camiones = leerVehiculos();
    camiones.forEach((camion, indice) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "camion-resumen-descarga";
        const titulo = document.createElement("h3");
        titulo.textContent = `CAMIÓN ${indice + 1}`;
        const chofer = document.createElement("p");
        chofer.textContent = `Chofer: ${camion.chofer || "Sin chofer"}`;
        const placa = document.createElement("p");
        placa.textContent = `Placa: ${camion.placa || "Sin placa"}`;
        const ruta = document.createElement("p");
        ruta.textContent = `Ruta: ${camion.ruta || "Sin ruta"}`;
        const total = fechas.reduce((suma, fecha) => {
            const valor = datosProveedor?.[fecha];
            const litros = valor && typeof valor === "object" ? Number(valor[String(camion.id)] || 0) : 0;
            return suma + (Number.isFinite(litros) && litros > 0 ? litros : 0);
        }, 0);
        const descargado = document.createElement("div");
        descargado.className = "total-camion-resumen-descarga";
        const etiquetaTotal = document.createElement("span");
        etiquetaTotal.textContent = "TOTAL DE DESCARGA";
        const litrosTotal = document.createElement("strong");
        litrosTotal.textContent = `${formatearLitros(total)} L`;
        descargado.append(etiquetaTotal, litrosTotal);
        tarjeta.append(titulo, chofer, placa, ruta, descargado);
        lista.appendChild(tarjeta);
    });
}

function actualizarTotalQuincenaDescarga() {
    const total = [...document.querySelectorAll("#contenedorTablasDescarga .entrada-litros-descarga-quincena")].reduce((suma, entrada) => {
        const valor = Number(entrada.value);
        return entrada.value !== "" && Number.isFinite(valor) && valor >= 0 ? suma + valor : suma;
    }, 0);
    $id("totalLitrosDescargaProveedor").textContent = formatearLitros(total);
}

function alternarEdicionDescargaProveedor() {
    if (!proveedorDescargaActual) return;
    if (edicionDescargaActiva) {
        if (!confirm("¿Deseas cancelar la edición? Los cambios sin guardar se perderán.")) return;
        edicionDescargaActiva = false;
        mensaje("mensajeDescargaProveedor", "Edición cancelada.");
    } else {
        edicionDescargaActiva = true;
        mensaje("mensajeDescargaProveedor", "Ingresa los litros descargados por día y pulsa GUARDAR.");
    }
    renderizarRegistroDescargaProveedor();
    if (edicionDescargaActiva) $id("contenedorTablasDescarga").querySelector("input")?.focus();
}

function guardarDescargaQuincenaProveedor() {
    if (!proveedorDescargaActual || !edicionDescargaActiva) return;
    const registros = leerRegistrosDescarga();
    const idProveedor = String(proveedorDescargaActual.id);
    const idCamion = String(camionDescargaSeleccionado || "");
    if (!idCamion) {
        mensaje("mensajeDescargaProveedor", "Registra primero un camión para asignar la descarga.");
        return;
    }
    registros[idProveedor] = registros[idProveedor] || {};
    document.querySelectorAll("#contenedorTablasDescarga .entrada-litros-descarga-quincena").forEach(input => {
        const fecha = input.dataset.fecha;
        const existente = registros[idProveedor][fecha];
        const cantidades = existente && typeof existente === "object"
            ? { ...existente }
            : (Number.isFinite(Number(existente)) && existente !== "" ? { __sinCamion: Number(existente) } : {});
        delete cantidades.__total;
        delete cantidades[idCamion];
        if (input.value !== "" && Number.isFinite(Number(input.value)) && Number(input.value) >= 0) {
            cantidades[idCamion] = Number(Number(input.value).toFixed(2));
        }
        if (Object.keys(cantidades).length) registros[idProveedor][fecha] = cantidades;
        else delete registros[idProveedor][fecha];
    });
    try {
        localStorage.setItem(CLAVE_REGISTROS_DESCARGA, JSON.stringify(registros));
        edicionDescargaActiva = false;
        mensaje("mensajeDescargaProveedor", "Totales actualizados con las descargas de los camiones.");
        renderizarRegistroDescargaProveedor();
    } catch (error) {
        console.error("Error al guardar la descarga:", error);
        mensaje("mensajeDescargaProveedor", "No se pudo guardar el registro.");
    }
}

function volverListaProveedoresDesdeRegistro() {
    proveedorDescargaActual = null;
    edicionDescargaActiva = false;
    $id("panelRegistroDescargaProveedor").hidden = true;
    $id("botonProveedorDescarga").hidden = false;
    $id("botonMicrofonoProveedores").closest(".zona-busqueda-proveedores").hidden = false;
    document.querySelector(".encabezado-lista-proveedores-descarga").hidden = false;
    $id("listaProveedoresResumenDescarga").hidden = false;
}

function configurarProveedoresDescarga() {
    const boton = $id("botonProveedorDescarga");
    const formulario = $id("formularioProveedorDescarga");
    const panel = $id("panelProveedoresDescarga");
    if (!boton || !formulario) return;
    boton.addEventListener("click", () => {
        boton.hidden = true;
        $id("botonMicrofonoProveedores").closest(".zona-busqueda-proveedores").hidden = true;
        document.querySelector(".encabezado-lista-proveedores-descarga").hidden = true;
        $id("listaProveedoresResumenDescarga").hidden = true;
        panel.hidden = false;
        boton.setAttribute("aria-expanded", "true");
        $id("nombreProveedorDescarga").focus();
    });
    $id("botonVolverProveedores").addEventListener("click", () => {
        panel.hidden = true;
        boton.hidden = false;
        $id("botonMicrofonoProveedores").closest(".zona-busqueda-proveedores").hidden = false;
        document.querySelector(".encabezado-lista-proveedores-descarga").hidden = false;
        $id("listaProveedoresResumenDescarga").hidden = false;
        boton.setAttribute("aria-expanded", "false");
        cancelarEdicionProveedorDescarga();
    });
    formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        const nombre = $id("nombreProveedorDescarga").value.trim();
        const precio = Number($id("precioProveedorDescarga").value);
        if (!nombre || !Number.isFinite(precio) || precio < 0) return;
        const proveedores = leerProveedoresDescarga();
        const id = $id("idProveedorDescarga").value;
        if (id) {
            const indice = proveedores.findIndex(item => String(item.id) === id);
            if (indice < 0) return;
            proveedores[indice] = { ...proveedores[indice], nombre, precio: Number(precio.toFixed(2)) };
        } else {
            proveedores.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, nombre, precio: Number(precio.toFixed(2)) });
        }
        localStorage.setItem(CLAVE_PROVEEDORES_DESCARGA, JSON.stringify(proveedores));
        cancelarEdicionProveedorDescarga();
        $id("mensajeProveedorDescarga").textContent = "Proveedor guardado.";
        mostrarProveedoresDescarga();
    });
    $id("botonCancelarProveedor").addEventListener("click", cancelarEdicionProveedorDescarga);
    $id("botonEditarDescargaProveedor")?.addEventListener("click", alternarEdicionDescargaProveedor);
    $id("botonGuardarDescargaProveedor")?.addEventListener("click", guardarDescargaQuincenaProveedor);
    $id("botonVolverRegistroDescarga")?.addEventListener("click", volverListaProveedoresDesdeRegistro);
    $id("buscarProveedorDescarga")?.addEventListener("input", mostrarProveedoresDescarga);
    $id("botonBuscarProveedorDescarga")?.addEventListener("click", mostrarProveedoresDescarga);
    $id("botonMicrofonoProveedores")?.addEventListener("click", buscarProveedoresPorVoz);
    mostrarProveedoresDescarga();
}

function buscarProveedoresPorVoz() {
    const boton = $id("botonMicrofonoProveedores");
    const estado = $id("estadoVozProveedores");
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) {
        estado.textContent = "El navegador no permite búsqueda por voz.";
        return;
    }
    const reconocimiento = new Reconocimiento();
    reconocimiento.lang = "es-PE";
    reconocimiento.interimResults = false;
    reconocimiento.maxAlternatives = 1;
    reconocimiento.onstart = () => {
        boton.classList.add("escuchando");
        estado.textContent = "Escuchando el nombre del proveedor...";
    };
    reconocimiento.onresult = evento => {
        $id("buscarProveedorDescarga").value = evento.results[0][0].transcript.trim();
        mostrarProveedoresDescarga();
        estado.textContent = "Búsqueda aplicada.";
    };
    reconocimiento.onerror = () => { estado.textContent = "No se pudo usar el micrófono. Revisa el permiso del navegador."; };
    reconocimiento.onend = () => boton.classList.remove("escuchando");
    reconocimiento.start();
}

function abrirSeccion(seccion) {
    const submenuAjustes = $id("submenuAjustes");
    if (submenuAjustes) submenuAjustes.hidden = true;
    $id("botonAjustes")?.setAttribute("aria-expanded", "false");

    const secciones = {
        inicio: "inicio",
        vehiculos: "seccionVehiculos",
        clientes: "seccionClientes",
        produccion: "seccionProduccion",
        finanzas: "seccionFinanzas",
        puntosDescarga: "seccionPuntosDescarga",
        reporte: "seccionReporte",
        dashboard: "seccionDashboard"
    };

    Object.values(secciones).forEach(id => {
        const elemento = $id(id);
        if (elemento) elemento.hidden = true;
    });

    cerrarVentana();

    if (seccion === "dashboard" && !$id("seccionDashboard")) {
        actualizarDashboard();
        mostrarVentana("vistaDashboard", "📊 REPORTE");
        return;
    }

    if (secciones[seccion]) {
        const elemento = $id(secciones[seccion]);
        if (elemento) elemento.hidden = false;
    }

    if (seccion === "vehiculos") {
        mostrarVehiculos();
    }

    if (seccion === "clientes") {
        volverListaCamionesClientes();
        mostrarVehiculosClientes();
    }

    if (seccion === "produccion") {
        detenerVozProduccion();
        volverListaCamionesProduccion();
        mostrarVehiculosProduccion();
    }

    if (seccion === "reporte") {
        volverCamionesReportes();
    }

    if (seccion === "finanzas") {
        volverListaCamionesFinanzas();
    }

    if (seccion === "dashboard") actualizarDashboard();

}

/* =========================================================
   ICONOS Y DATOS DE CAMIONES
========================================================= */

function crearIconoLapiz() {
    const lapiz = document.createElement("span");
    lapiz.className = "icono-lapiz";
    lapiz.textContent = "✏️";
    lapiz.setAttribute("aria-hidden", "true");
    return lapiz;
}

function crearIconoPuntos() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "23");
    svg.setAttribute("height", "23");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    [5, 12, 19].forEach(x => {
        const punto = document.createElementNS(NS, "circle");
        punto.setAttribute("cx", String(x));
        punto.setAttribute("cy", "12");
        punto.setAttribute("r", "1.8");
        svg.appendChild(punto);
    });

    return svg;
}

function crearIconoCamion() {
    const zona = document.createElement("div");
    zona.className = "icono-camion-tarjeta";
    zona.setAttribute("role", "img");
    zona.setAttribute("aria-label", "Camión de carga");
    zona.textContent = "🚚";
    return zona;
}

function crearDatoCamion(texto, clases) {
    const parrafo = document.createElement("p");
    parrafo.className = "dato-camion " + clases;
    parrafo.textContent = texto;
    return parrafo;
}

/* =========================================================
   MOSTRAR CAMIONES EN VEHÍCULOS
========================================================= */

function mostrarVehiculos() {
    const contenedor = $id("listaVehiculos");
    if (!contenedor) return;

    const lista = leerVehiculos();
    contenedor.replaceChildren();

    if (lista.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "mensaje-sin-camiones";
        vacio.textContent = "Todavía no hay camiones registrados.";
        contenedor.appendChild(vacio);
        return;
    }

    lista.forEach((vehiculo, indice) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-vehiculo";

        if (vehiculo.activo === false) tarjeta.classList.add("inactivo");

        const numero = document.createElement("h4");
        numero.className = "numero-camion";
        numero.textContent = "CAMIÓN " + (indice + 1);

        tarjeta.append(numero, crearIconoCamion());

        tarjeta.appendChild(crearDatoCamion(
            "Chofer: " + (vehiculo.chofer || "Sin chofer"),
            "nombre-chofer-camion"
        ));

        obtenerAyudantes(vehiculo).forEach((nombre, posicion) => {
            tarjeta.appendChild(crearDatoCamion(
                "Ayudante " + (posicion + 1) + ": " + nombre,
                "ayudantes-camion"
            ));
        });

        tarjeta.appendChild(crearDatoCamion(
            "Placa: " + (vehiculo.placa || "Sin placa"),
            "placa-camion"
        ));

        tarjeta.appendChild(crearDatoCamion(
            "Ruta: " + (vehiculo.ruta || "Sin ruta"),
            "ruta-camion"
        ));

        const acciones = document.createElement("div");
        acciones.className = "acciones-tarjeta";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className =
            "boton-icono-tarjeta boton-editar-icono";
        botonEditar.setAttribute("aria-label", "Editar camión");
        botonEditar.title = "Editar camión";
        botonEditar.appendChild(crearIconoLapiz());
        botonEditar.addEventListener("click", () => editarVehiculo(vehiculo.id));

        const botonOpciones = document.createElement("button");
        botonOpciones.type = "button";
        botonOpciones.className =
            "boton-icono-tarjeta boton-opciones-icono";
        botonOpciones.setAttribute("aria-label", "Opciones del camión");
        botonOpciones.title = "Más opciones";
        botonOpciones.appendChild(crearIconoPuntos());

        const menu = document.createElement("div");
        menu.className = "menu-opciones-camion";
        menu.hidden = true;

        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className = "boton-eliminar-camion";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.addEventListener("click", () => eliminarVehiculo(vehiculo.id));

        menu.appendChild(botonEliminar);

        botonOpciones.addEventListener("click", function () {
            const estabaAbierto = !menu.hidden;

            document.querySelectorAll(".menu-opciones-camion")
                .forEach(otroMenu => { otroMenu.hidden = true; });

            menu.hidden = estabaAbierto;
        });

        acciones.append(botonEditar, botonOpciones, menu);
        tarjeta.appendChild(acciones);
        contenedor.appendChild(tarjeta);
    });
}

/* =========================================================
   ELIMINAR CAMIÓN
========================================================= */

function eliminarVehiculo(id) {
    const lista = leerVehiculos();

    const vehiculo = lista.find(
        elemento => String(elemento.id) === String(id)
    );

    if (!vehiculo) {
        alert("No se encontró el camión.");
        return;
    }

    const confirmado = confirm(
        "¿Estás seguro de eliminar el camión con placa " +
        (vehiculo.placa || "sin placa") +
        "?\n\nTambién se eliminarán los clientes y la producción de este camión."
    );

    if (!confirmado) return;

    try {
        guardarVehiculos(lista.filter(
            elemento => String(elemento.id) !== String(id)
        ));

        const todosClientes = leerTodosLosClientesAdmin();
        delete todosClientes[String(id)];
        guardarTodosLosClientesAdmin(todosClientes);

        eliminarProduccionDeVehiculo(id);

        if (
            vehiculoClientesActual &&
            String(vehiculoClientesActual.id) === String(id)
        ) {
            volverListaCamionesClientes();
        }

        if (
            vehiculoProduccionActual &&
            String(vehiculoProduccionActual.id) === String(id)
        ) {
            volverListaCamionesProduccion();
        }

        mostrarVehiculos();
        mostrarVehiculosClientes();
        mostrarVehiculosProduccion();
        actualizarDashboard();

    } catch (error) {
        console.error("Error al eliminar el camión:", error);
        alert("No se pudo eliminar el camión.");
    }
}

/* =========================================================
   CLIENTES: TARJETAS DE CAMIONES
========================================================= */

function mostrarVehiculosClientes() {
    const contenedor = $id("listaVehiculosClientes");
    if (!contenedor) return;

    const lista = leerVehiculos();
    contenedor.replaceChildren();

    if (lista.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "mensaje-sin-camiones";
        vacio.textContent = "Primero registra un camión en VEHÍCULOS.";
        contenedor.appendChild(vacio);
        return;
    }

    lista.forEach((vehiculo, indice) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-vehiculo tarjeta-cliente-camion";

        if (vehiculo.activo === false) tarjeta.classList.add("inactivo");

        const numero = document.createElement("h4");
        numero.className = "numero-camion";
        numero.textContent = "CAMIÓN " + (indice + 1);

        tarjeta.append(numero, crearIconoCamion());

        tarjeta.appendChild(crearDatoCamion(
            "Chofer: " + (vehiculo.chofer || "Sin chofer"),
            "nombre-chofer-camion"
        ));

        obtenerAyudantes(vehiculo).forEach((nombre, posicion) => {
            tarjeta.appendChild(crearDatoCamion(
                "Ayudante " + (posicion + 1) + ": " + nombre,
                "ayudantes-camion"
            ));
        });

        tarjeta.appendChild(crearDatoCamion(
            "Placa: " + (vehiculo.placa || "Sin placa"),
            "placa-camion"
        ));

        tarjeta.appendChild(crearDatoCamion(
            "Ruta: " + (vehiculo.ruta || "Sin ruta"),
            "ruta-camion"
        ));

        const zonaAccion = document.createElement("div");
        zonaAccion.className = "acciones-tarjeta-clientes";

        const botonIngresar = document.createElement("button");
        botonIngresar.type = "button";
        botonIngresar.className = "boton-ingresar-clientes";
        botonIngresar.textContent = "INGRESAR";
        botonIngresar.addEventListener(
            "click",
            () => ingresarClientesVehiculo(vehiculo.id)
        );

        zonaAccion.appendChild(botonIngresar);
        tarjeta.appendChild(zonaAccion);
        contenedor.appendChild(tarjeta);
    });
}

/* =========================================================
   CLIENTES: ENTRAR Y REGRESAR
========================================================= */

function ingresarClientesVehiculo(id) {
    const vehiculo = leerVehiculos().find(
        elemento => String(elemento.id) === String(id)
    );

    if (!vehiculo) {
        alert("No se encontró el camión seleccionado.");
        return;
    }

    detenerVozClientesAdmin();
    vehiculoClientesActual = vehiculo;

    if ($id("panelListaCamionesClientes")) {
        $id("panelListaCamionesClientes").hidden = true;
    }

    if ($id("panelClientesCamion")) {
        $id("panelClientesCamion").hidden = false;
    }

    if ($id("tituloClientesCamion")) {
        $id("tituloClientesCamion").textContent = "CLIENTES DEL CAMIÓN";
    }

    if ($id("datosClientesCamion")) {
        $id("datosClientesCamion").textContent =
            "Camión: " + (vehiculo.placa || "Sin placa") +
            " · Chofer: " + (vehiculo.chofer || "Sin chofer") +
            " · Ruta: " + (vehiculo.ruta || "Sin ruta");
    }

    if ($id("buscarClienteAdmin")) {
        $id("buscarClienteAdmin").value = "";
    }

    cancelarEdicionClienteAdmin();
    mostrarListaClientesAdmin();
}

function volverListaCamionesClientes() {
    detenerVozClientesAdmin();
    vehiculoClientesActual = null;

    if ($id("panelListaCamionesClientes")) {
        $id("panelListaCamionesClientes").hidden = false;
    }

    if ($id("panelClientesCamion")) {
        $id("panelClientesCamion").hidden = true;
    }

    if ($id("buscarClienteAdmin")) {
        $id("buscarClienteAdmin").value = "";
    }

    cancelarEdicionClienteAdmin();
    mostrarVehiculosClientes();
}

/* =========================================================
   CLIENTES: REGISTRAR O ACTUALIZAR
========================================================= */

const formularioClienteAdmin = $id("formularioClienteAdmin");

if (formularioClienteAdmin) {
    formularioClienteAdmin.addEventListener("submit", function (evento) {
        evento.preventDefault();

        if (!vehiculoClientesActual) {
            mensaje("mensajeClienteAdmin", "Selecciona un camión primero.");
            return;
        }

        const idEdicion = $id("idClienteAdmin").value;
        const nombre = $id("nombreClienteAdmin").value.trim();
        const precioTexto = $id("precioClienteAdmin").value;
        const precio = Number(precioTexto);

        if (!nombre) {
            mensaje("mensajeClienteAdmin", "Escribe el nombre del cliente.");
            return;
        }

        if (
            precioTexto.trim() === "" ||
            !Number.isFinite(precio) ||
            precio < 0
        ) {
            mensaje(
                "mensajeClienteAdmin",
                "Escribe un precio válido por litro."
            );
            return;
        }

        const lista = leerClientesDeVehiculo(vehiculoClientesActual.id);

        const duplicado = lista.some(cliente =>
            normalizarBusquedaAdmin(cliente.nombre) ===
                normalizarBusquedaAdmin(nombre) &&
            String(cliente.id) !== String(idEdicion)
        );

        if (duplicado) {
            mensaje(
                "mensajeClienteAdmin",
                "Este cliente ya está registrado en este camión."
            );
            return;
        }

        try {
            if (idEdicion) {
                const indice = lista.findIndex(
                    cliente => String(cliente.id) === String(idEdicion)
                );

                if (indice < 0) {
                    mensaje("mensajeClienteAdmin", "No se encontró el cliente.");
                    return;
                }

                lista[indice] = {
                    ...lista[indice],
                    nombre,
                    precio: Number(precio.toFixed(2)),
                    actualizado: new Date().toISOString()
                };

                guardarClientesDeVehiculo(vehiculoClientesActual.id, lista);
                cancelarEdicionClienteAdmin();
                mensaje("mensajeClienteAdmin", "Cliente actualizado correctamente.");
            } else {
                lista.push({
                    id: "cli-" + Date.now() + "-" +
                        Math.random().toString(36).slice(2, 8),
                    nombre,
                    precio: Number(precio.toFixed(2)),
                    fechaRegistro: new Date().toISOString()
                });

                guardarClientesDeVehiculo(vehiculoClientesActual.id, lista);
                formularioClienteAdmin.reset();
                $id("idClienteAdmin").value = "";

                mensaje("mensajeClienteAdmin", "Cliente guardado correctamente.");
            }

            mostrarListaClientesAdmin();
            mostrarClientesProduccion();

        } catch (error) {
            console.error("Error al guardar cliente:", error);
            mensaje(
                "mensajeClienteAdmin",
                "No se pudo guardar el cliente. Revisa el espacio disponible."
            );
        }
    });
}

/* =========================================================
   CLIENTES: LISTAR Y BUSCAR
========================================================= */

function buscarClientesAdmin() {
    mostrarListaClientesAdmin();
}

function mostrarListaClientesAdmin() {
    const contenedor = $id("listaClientesAdmin");
    if (!contenedor) return;

    contenedor.replaceChildren();

    if (!vehiculoClientesActual) {
        if ($id("totalClientesAdmin")) {
            $id("totalClientesAdmin").textContent = "0 clientes";
        }
        return;
    }

    const todos = leerClientesDeVehiculo(vehiculoClientesActual.id);
    const consulta = normalizarBusquedaAdmin(
        $id("buscarClienteAdmin")?.value || ""
    );

    const filtrados = todos.filter(cliente =>
        normalizarBusquedaAdmin(cliente.nombre).includes(consulta)
    );

    if ($id("totalClientesAdmin")) {
        $id("totalClientesAdmin").textContent =
            filtrados.length +
            (filtrados.length === 1 ? " cliente" : " clientes");
    }

    if (filtrados.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "lista-clientes-vacia";
        vacio.textContent = todos.length === 0
            ? "Todavía no hay clientes registrados en este camión."
            : "No se encontraron clientes con esa búsqueda.";

        contenedor.appendChild(vacio);
        return;
    }

    filtrados.forEach(cliente => {
        const fila = document.createElement("article");
        fila.className = "fila-cliente-admin";

        const datos = document.createElement("div");
        datos.className = "datos-fila-cliente";

        const nombre = document.createElement("p");
        nombre.className = "nombre-fila-cliente";
        nombre.textContent = cliente.nombre;

        const precio = document.createElement("p");
        precio.className = "precio-fila-cliente";
        precio.textContent = "Precio por litro: S/ " +
            formatearPrecio(cliente.precio);

        datos.append(nombre, precio);

        const acciones = document.createElement("div");
        acciones.className = "acciones-fila-cliente";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className = "boton-editar-cliente";
        botonEditar.textContent = "✏️";
        botonEditar.title = "Editar cliente";
        botonEditar.setAttribute("aria-label", "Editar " + cliente.nombre);
        botonEditar.addEventListener(
            "click",
            () => editarClienteAdmin(cliente.id)
        );

        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className = "boton-eliminar-cliente";
        botonEliminar.textContent = "🗑️";
        botonEliminar.title = "Eliminar cliente";
        botonEliminar.setAttribute("aria-label", "Eliminar " + cliente.nombre);
        botonEliminar.addEventListener(
            "click",
            () => eliminarClienteAdmin(cliente.id)
        );

        acciones.append(botonEditar, botonEliminar);
        fila.append(datos, acciones);
        contenedor.appendChild(fila);
    });
}

const campoBusquedaClienteAdmin = $id("buscarClienteAdmin");

if (campoBusquedaClienteAdmin) {
    campoBusquedaClienteAdmin.addEventListener(
        "input",
        mostrarListaClientesAdmin
    );

    campoBusquedaClienteAdmin.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter") {
            evento.preventDefault();
            buscarClientesAdmin();
        }
    });
}

/* =========================================================
   CLIENTES: EDITAR Y CANCELAR
========================================================= */

function editarClienteAdmin(id) {
    if (!vehiculoClientesActual) return;

    const cliente = leerClientesDeVehiculo(vehiculoClientesActual.id)
        .find(elemento => String(elemento.id) === String(id));

    if (!cliente) {
        alert("No se encontró el cliente.");
        return;
    }

    $id("idClienteAdmin").value = cliente.id;
    $id("nombreClienteAdmin").value = cliente.nombre || "";
    $id("precioClienteAdmin").value = formatearPrecio(cliente.precio);

    $id("botonGuardarClienteAdmin").textContent = "ACTUALIZAR";
    $id("botonCancelarEdicionCliente").hidden = false;

    mensaje("mensajeClienteAdmin", "Editando: " + cliente.nombre);

    $id("nombreClienteAdmin").focus();
    $id("formularioClienteAdmin").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function cancelarEdicionClienteAdmin() {
    const formulario = $id("formularioClienteAdmin");
    if (formulario) formulario.reset();

    if ($id("idClienteAdmin")) $id("idClienteAdmin").value = "";

    if ($id("botonGuardarClienteAdmin")) {
        $id("botonGuardarClienteAdmin").textContent = "GUARDAR";
    }

    if ($id("botonCancelarEdicionCliente")) {
        $id("botonCancelarEdicionCliente").hidden = true;
    }

    mensaje("mensajeClienteAdmin", "");
}

/* =========================================================
   CLIENTES: ELIMINAR
========================================================= */

function eliminarClienteAdmin(id) {
    if (!vehiculoClientesActual) return;

    const lista = leerClientesDeVehiculo(vehiculoClientesActual.id);
    const cliente = lista.find(
        elemento => String(elemento.id) === String(id)
    );

    if (!cliente) {
        alert("No se encontró el cliente.");
        return;
    }

    const claveDatos = crearClaveClienteProduccion(
        vehiculoClientesActual.id,
        cliente.id
    );

    const produccion = leerProduccion();
    const tieneProduccion = Boolean(produccion[claveDatos]);

    if (tieneProduccion) {
        const confirmado = confirm(
            "Este cliente tiene un historial de producción.\n\n" +
            "Si lo eliminas, el historial se conservará en el almacenamiento, " +
            "pero ya no aparecerá en la lista de clientes.\n\n¿Deseas continuar?"
        );

        if (!confirmado) return;
    } else if (!confirm("¿Deseas eliminar al cliente " + cliente.nombre + "?")) {
        return;
    }

    try {
        archivarClienteParaReportes(vehiculoClientesActual.id, cliente);
        guardarClientesDeVehiculo(
            vehiculoClientesActual.id,
            lista.filter(elemento => String(elemento.id) !== String(id))
        );

        if (String($id("idClienteAdmin")?.value) === String(id)) {
            cancelarEdicionClienteAdmin();
        }

        mostrarListaClientesAdmin();
        mostrarClientesProduccion();

        mensaje("mensajeClienteAdmin", "Cliente eliminado correctamente.");

    } catch (error) {
        console.error("Error al eliminar cliente:", error);
        alert("No se pudo eliminar el cliente.");
    }
}

/* =========================================================
   CLIENTES: BÚSQUEDA POR VOZ
========================================================= */

function alternarVozClientesAdmin() {
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        mensaje(
            "estadoVozClientesAdmin",
            "El navegador no admite búsqueda por voz. Puedes escribir el nombre."
        );
        return;
    }

    if (vozClientesActiva && reconocimientoClientesAdmin) {
        detenerVozClientesAdmin();
        return;
    }

    reconocimientoClientesAdmin = new SpeechRecognition();
    reconocimientoClientesAdmin.lang = "es-PE";
    reconocimientoClientesAdmin.continuous = false;
    reconocimientoClientesAdmin.interimResults = false;
    reconocimientoClientesAdmin.maxAlternatives = 3;

    reconocimientoClientesAdmin.onstart = function () {
        vozClientesActiva = true;
        $id("botonMicrofonoClientes")?.classList.add("escuchando");
        mensaje("estadoVozClientesAdmin", "Escuchando... di el nombre del cliente.");
    };

    reconocimientoClientesAdmin.onresult = function (evento) {
        const resultado = evento.results[0];
        const transcripcion = resultado && resultado[0]
            ? resultado[0].transcript.trim()
            : "";

        if (transcripcion) {
            $id("buscarClienteAdmin").value = transcripcion;
            mostrarListaClientesAdmin();
            mensaje("estadoVozClientesAdmin", "Búsqueda por voz: " + transcripcion);
        } else {
            mensaje("estadoVozClientesAdmin", "No se reconoció el nombre. Inténtalo otra vez.");
        }
    };

    reconocimientoClientesAdmin.onerror = function (evento) {
        console.warn("Error de reconocimiento de voz:", evento.error);

        mensaje(
            "estadoVozClientesAdmin",
            evento.error === "not-allowed"
                ? "Permite el acceso al micrófono en el navegador."
                : evento.error === "no-speech"
                    ? "No se detectó voz. Inténtalo otra vez."
                    : "No se pudo usar el micrófono. Inténtalo otra vez."
        );
    };

    reconocimientoClientesAdmin.onend = function () {
        vozClientesActiva = false;
        $id("botonMicrofonoClientes")?.classList.remove("escuchando");
    };

    try {
        reconocimientoClientesAdmin.start();
    } catch (error) {
        console.error("No se pudo iniciar el micrófono:", error);
        mensaje("estadoVozClientesAdmin", "No se pudo iniciar el micrófono. Inténtalo otra vez.");
        detenerVozClientesAdmin();
    }
}

function detenerVozClientesAdmin() {
    if (reconocimientoClientesAdmin) {
        try {
            reconocimientoClientesAdmin.stop();
        } catch (error) {
            console.warn("El reconocimiento ya estaba detenido.", error);
        }
    }

    vozClientesActiva = false;
    $id("botonMicrofonoClientes")?.classList.remove("escuchando");
}

/* =========================================================
   PRODUCCIÓN: ALMACENAMIENTO
========================================================= */

function leerProduccion() {
    try {
        const datos = JSON.parse(
            localStorage.getItem(CLAVE_PRODUCCION) || "{}"
        );

        return datos && typeof datos === "object" && !Array.isArray(datos)
            ? datos
            : {};
    } catch (error) {
        console.error("Error al leer producción:", error);
        return {};
    }
}

function guardarTodosLosDatosProduccion(datos) {
    localStorage.setItem(CLAVE_PRODUCCION, JSON.stringify(datos));
}

function crearClaveClienteProduccion(idVehiculo, idCliente) {
    return String(idVehiculo) + "::" + String(idCliente);
}

function crearClavePeriodoProduccion(anio, mes, quincena) {
    return String(anio) + "-" +
        String(mes).padStart(2, "0") + "-Q" + String(quincena);
}

/* =========================================================
   FECHAS Y QUINCENAS
========================================================= */

const NOMBRES_MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const NOMBRES_DIAS = [
    "domingo", "lunes", "martes", "miércoles",
    "jueves", "viernes", "sábado"
];

function fechaLocalISO(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function fechaDesdeISO(texto) {
    const partes = String(texto).split("-").map(Number);
    return new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
}

function obtenerPeriodoActual() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    const quincena = hoy.getDate() <= 15 ? 1 : 2;

    return crearClavePeriodoProduccion(anio, mes, quincena);
}

function datosPeriodoDesdeClave(clave) {
    const coincidencia = /^(\d{4})-(\d{2})-Q([12])$/.exec(String(clave));

    if (!coincidencia) return null;

    const anio = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const quincena = Number(coincidencia[3]);

    if (mes < 1 || mes > 12) return null;

    const diaInicio = quincena === 1 ? 1 : 16;
    const diaFin = quincena === 1
        ? 15
        : new Date(anio, mes, 0).getDate();

    const inicio = new Date(anio, mes - 1, diaInicio, 12, 0, 0);
    const fin = new Date(anio, mes - 1, diaFin, 12, 0, 0);

    return {
        clave,
        anio,
        mes,
        quincena,
        inicio,
        fin,
        fechaInicio: fechaLocalISO(inicio),
        fechaFin: fechaLocalISO(fin),
        etiqueta:
            quincena + ".ª quincena · " +
            NOMBRES_MESES[mes - 1] + " " + anio +
            (quincena === 1
                ? " · días 1–15"
                : " · días 16–" + diaFin)
    };
}

function obtenerClavesPeriodosAnteriores(claveActual, produccionCliente) {
    return Object.keys(produccionCliente || {})
        .filter(clave => clave !== claveActual)
        .filter(clave => Boolean(datosPeriodoDesdeClave(clave)))
        .sort((a, b) => {
            const fechaA = datosPeriodoDesdeClave(a).inicio.getTime();
            const fechaB = datosPeriodoDesdeClave(b).inicio.getTime();
            return fechaB - fechaA;
        });
}

function periodoTieneRegistros(periodo) {
    const litros = periodo && periodo.litros && typeof periodo.litros === "object"
        ? Object.values(periodo.litros)
        : [];

    return litros.some(valor => {
        if (valor === "" || valor === null || valor === undefined) return false;
        const numero = Number(valor);
        return Number.isFinite(numero) && numero >= 0;
    });
}

/* =========================================================
   LIMPIEZA AUTOMÁTICA DEL HISTORIAL DESPUÉS DE UN AÑO
========================================================= */

function periodoYaCaducado(clave) {
    const datos = datosPeriodoDesdeClave(clave);
    if (!datos) return true;

    const fechaCaducidad = new Date(datos.fin);
    fechaCaducidad.setFullYear(fechaCaducidad.getFullYear() + 1);

    return new Date() >= fechaCaducidad;
}

function limpiarProduccionCaducada() {
    const todos = leerProduccion();
    let huboCambios = false;

    Object.keys(todos).forEach(claveCliente => {
        const periodos = todos[claveCliente];

        if (!periodos || typeof periodos !== "object") {
            delete todos[claveCliente];
            huboCambios = true;
            return;
        }

        Object.keys(periodos).forEach(clavePeriodo => {
            if (periodoYaCaducado(clavePeriodo)) {
                delete periodos[clavePeriodo];
                huboCambios = true;
            }
        });

        if (Object.keys(periodos).length === 0) {
            delete todos[claveCliente];
            huboCambios = true;
        }
    });

    if (huboCambios) {
        try {
            guardarTodosLosDatosProduccion(todos);
        } catch (error) {
            console.error("No se pudo limpiar el historial caducado:", error);
        }
    }

    return todos;
}

function eliminarProduccionDeVehiculo(idVehiculo) {
    const todos = leerProduccion();
    const prefijo = String(idVehiculo) + "::";

    Object.keys(todos).forEach(clave => {
        if (clave.startsWith(prefijo)) {
            delete todos[clave];
        }
    });

    guardarTodosLosDatosProduccion(todos);
}

/* =========================================================
   OBTENER DATOS SIN CREAR REGISTROS VACÍOS
========================================================= */

function leerDatosQuincenaGuardados(idVehiculo, idCliente, clavePeriodo) {
    const todos = leerProduccion();
    const claveCliente = crearClaveClienteProduccion(idVehiculo, idCliente);

    return todos[claveCliente]?.[clavePeriodo] || {
        periodo: clavePeriodo,
        litros: {},
        guardado: null
    };
}

/* =========================================================
   OBTENER Y PREPARAR DATOS DE UNA QUINCENA
========================================================= */

function obtenerDatosQuincena(idVehiculo, idCliente, clavePeriodo) {
    const todos = limpiarProduccionCaducada();
    const claveCliente = crearClaveClienteProduccion(idVehiculo, idCliente);

    if (!todos[claveCliente]) todos[claveCliente] = {};

    if (!todos[claveCliente][clavePeriodo]) {
        const datosPeriodo = datosPeriodoDesdeClave(clavePeriodo);

        todos[claveCliente][clavePeriodo] = {
            periodo: clavePeriodo,
            inicio: datosPeriodo?.fechaInicio || null,
            fin: datosPeriodo?.fechaFin || null,
            litros: {},
            guardado: null
        };
    }

    return todos[claveCliente][clavePeriodo];
}

function sumarLitrosPeriodo(periodo) {
    const litros = periodo && periodo.litros
        ? Object.values(periodo.litros)
        : [];

    return litros.reduce((total, valor) => {
        const numero = Number(valor);
        return total + (
            Number.isFinite(numero) && numero >= 0 ? numero : 0
        );
    }, 0);
}

function formatearLitros(valor) {
    return Number(valor || 0).toLocaleString("es-PE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/* =========================================================
   REPORTES IMPRIMIBLES POR CLIENTE Y QUINCENA
========================================================= */

function mostrarVehiculosReportes() {
    const contenedor = $id("listaVehiculosReporte");
    if (!contenedor) return;
    contenedor.replaceChildren();
    const vehiculos = leerVehiculos();
    if (!vehiculos.length) {
        const vacio = document.createElement("p");
        vacio.className = "mensaje-sin-camiones";
        vacio.textContent = "Primero registra un camión en VEHÍCULOS.";
        contenedor.appendChild(vacio);
        return;
    }

    vehiculos.forEach((vehiculo, indice) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-vehiculo tarjeta-produccion-camion";
        if (vehiculo.activo === false) tarjeta.classList.add("inactivo");
        const numero = document.createElement("h4");
        numero.className = "numero-camion";
        numero.textContent = "CAMIÓN " + (indice + 1);
        tarjeta.append(numero, crearIconoCamion());
        tarjeta.appendChild(crearDatoCamion("Chofer: " + (vehiculo.chofer || "Sin chofer"), "nombre-chofer-camion"));
        obtenerAyudantes(vehiculo).forEach((nombre, posicion) => {
            tarjeta.appendChild(crearDatoCamion("Ayudante " + (posicion + 1) + ": " + nombre, "ayudantes-camion"));
        });
        tarjeta.appendChild(crearDatoCamion("Placa: " + (vehiculo.placa || "Sin placa"), "placa-camion"));
        tarjeta.appendChild(crearDatoCamion("Ruta: " + (vehiculo.ruta || "Sin ruta"), "ruta-camion"));
        const acciones = document.createElement("div");
        acciones.className = "acciones-tarjeta-produccion";
        const ingresar = document.createElement("button");
        ingresar.type = "button";
        ingresar.className = "boton-ingresar-clientes";
        ingresar.textContent = "INGRESAR";
        ingresar.addEventListener("click", () => ingresarCamionReportes(vehiculo.id));
        acciones.appendChild(ingresar);
        tarjeta.appendChild(acciones);
        contenedor.appendChild(tarjeta);
    });
}

function claveQuincenaAnteriorReporte(clave) {
    const periodo = datosPeriodoDesdeClave(clave);
    if (!periodo) return null;
    if (periodo.quincena === 2) {
        return crearClavePeriodoProduccion(periodo.anio, periodo.mes, 1);
    }
    const fechaMesAnterior = new Date(periodo.anio, periodo.mes - 2, 1, 12);
    return crearClavePeriodoProduccion(
        fechaMesAnterior.getFullYear(),
        fechaMesAnterior.getMonth() + 1,
        2
    );
}

function clavePeriodoPredeterminadoReporte(fecha = new Date()) {
    const dia = fecha.getDate();
    const claveQuincenaEnCurso = crearClavePeriodoProduccion(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        dia <= 15 ? 1 : 2
    );
    const dentroDelMargen = (dia >= 16 && dia <= 17) || (dia >= 1 && dia <= 2);
    return dentroDelMargen
        ? claveQuincenaAnteriorReporte(claveQuincenaEnCurso)
        : claveQuincenaEnCurso;
}

function fijarPeriodoReporte(clave) {
    const periodo = datosPeriodoDesdeClave(clave);
    if (!periodo) return;
    const campoMes = $id("mesReporte");
    const campoQuincena = $id("quincenaReporte");
    if (campoMes) campoMes.value = `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`;
    if (campoQuincena) campoQuincena.value = String(periodo.quincena);
}

function renderizarArchivoReportes() {
    const lista = $id("listaArchivoReportes");
    if (!lista) return;
    lista.replaceChildren();

    const periodoVisiblePorDefecto = clavePeriodoPredeterminadoReporte();
    const claves = [];
    let clave = claveQuincenaAnteriorReporte(periodoVisiblePorDefecto);
    for (let i = 0; i < 12 && clave; i++) {
        claves.push(clave);
        clave = claveQuincenaAnteriorReporte(clave);
    }

    const opcionActual = document.createElement("button");
    opcionActual.type = "button";
    opcionActual.className = "opcion-quincena-archivo opcion-quincena-actual";
    opcionActual.textContent = "Quincena actual";
    opcionActual.setAttribute("aria-label", "Volver a la quincena actual");
    if (!periodoArchivoSeleccionadoReportes) opcionActual.classList.add("seleccionada");
    opcionActual.addEventListener("click", () => {
        periodoArchivoSeleccionadoReportes = false;
        fijarPeriodoReporte(periodoVisiblePorDefecto);
        renderizarArchivoReportes();
        renderizarReportes();
        const panel = $id("panelArchivoReportes");
        const boton = $id("botonArchivoReportes");
        if (panel) panel.hidden = true;
        boton?.setAttribute("aria-expanded", "false");
    });
    lista.appendChild(opcionActual);

    const grupos = new Map();
    claves.forEach(clavePeriodo => {
        const periodo = datosPeriodoDesdeClave(clavePeriodo);
        const claveMes = `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`;
        if (!grupos.has(claveMes)) grupos.set(claveMes, []);
        grupos.get(claveMes).push(periodo);
    });

    grupos.forEach((periodos, claveMes) => {
        const grupo = document.createElement("section");
        grupo.className = "grupo-mes-archivo-reportes";
        const titulo = document.createElement("h3");
        const [anio, mes] = claveMes.split("-").map(Number);
        titulo.textContent = `${NOMBRES_MESES[mes - 1].toUpperCase()} ${anio}`;
        grupo.appendChild(titulo);

        periodos.forEach(periodo => {
            const opcion = document.createElement("button");
            opcion.type = "button";
            opcion.className = "opcion-quincena-archivo";
            opcion.textContent = periodo.quincena === 1 ? "Primera quincena" : "Segunda quincena";
            opcion.setAttribute("aria-label", `${opcion.textContent} de ${NOMBRES_MESES[periodo.mes - 1]} ${periodo.anio}`);
            const periodoSeleccionado = $id("mesReporte")?.value === `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}` &&
                $id("quincenaReporte")?.value === String(periodo.quincena);
            if (periodoArchivoSeleccionadoReportes && periodoSeleccionado) opcion.classList.add("seleccionada");
            opcion.addEventListener("click", () => {
                fijarPeriodoReporte(periodo.clave);
                periodoArchivoSeleccionadoReportes = true;
                renderizarArchivoReportes();
                renderizarReportes();
                const panel = $id("panelArchivoReportes");
                const boton = $id("botonArchivoReportes");
                if (panel) panel.hidden = true;
                boton?.setAttribute("aria-expanded", "false");
            });
            grupo.appendChild(opcion);
        });
        lista.appendChild(grupo);
    });
}

function ingresarCamionReportes(idVehiculo) {
    const vehiculo = leerVehiculos().find(item => String(item.id) === String(idVehiculo));
    if (!vehiculo) return;
    vehiculoReporteActual = vehiculo;
    periodoArchivoSeleccionadoReportes = false;
    fijarPeriodoReporte(clavePeriodoPredeterminadoReporte());
    renderizarArchivoReportes();
    const panelArchivo = $id("panelArchivoReportes");
    if (panelArchivo) panelArchivo.hidden = true;
    $id("botonArchivoReportes")?.setAttribute("aria-expanded", "false");
    const indice = leerVehiculos().findIndex(item => String(item.id) === String(vehiculo.id));
    const ayudantes = obtenerAyudantes(vehiculo);
    const personal = [
        "Chofer: " + (vehiculo.chofer || "Sin chofer"),
        "Ayudante: " + (ayudantes.length ? ayudantes.join(", ") : "Sin ayudante"),
        "Placa: " + (vehiculo.placa || "Sin placa")
    ];
    $id("datosClientesReporte").textContent =
        "Camión " + (indice >= 0 ? indice + 1 : 1) + "\n" + personal.join(" · ") + "\nRuta: " + (vehiculo.ruta || "Sin ruta");
    const datosReporte = $id("datosClientesReporte");
    const lineasDatosReporte = [
        `Camión ${indice >= 0 ? indice + 1 : 1}`,
        `Chofer: ${vehiculo.chofer || "Sin chofer"} · Placa: ${vehiculo.placa || "Sin placa"}`,
        `Ruta: ${vehiculo.ruta || "Sin ruta"}`
    ];
    datosReporte.replaceChildren(...lineasDatosReporte.map(texto => {
        const linea = document.createElement("span");
        linea.textContent = texto;
        return linea;
    }));
    $id("panelListaCamionesReporte").hidden = true;
    $id("panelClientesReporte").hidden = false;
    renderizarReportes();
}

function volverCamionesReportes() {
    vehiculoReporteActual = null;
    if ($id("panelListaCamionesReporte")) $id("panelListaCamionesReporte").hidden = false;
    if ($id("panelClientesReporte")) $id("panelClientesReporte").hidden = true;
    mostrarVehiculosReportes();
}

function configurarReportes() {
    const campoMes = $id("mesReporte");
    const campoQuincena = $id("quincenaReporte");
    if (!campoMes || !campoQuincena) return;

    const botonArchivo = $id("botonArchivoReportes");
    const panelArchivo = $id("panelArchivoReportes");
    botonArchivo?.addEventListener("click", () => {
        const abrir = panelArchivo?.hidden;
        if (abrir) renderizarArchivoReportes();
        if (panelArchivo) panelArchivo.hidden = !abrir;
        botonArchivo.setAttribute("aria-expanded", String(Boolean(abrir)));
    });
    document.addEventListener("click", evento => {
        if (!panelArchivo || panelArchivo.hidden) return;
        if (panelArchivo.contains(evento.target) || botonArchivo?.contains(evento.target)) return;
        panelArchivo.hidden = true;
        botonArchivo?.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape" || !panelArchivo || panelArchivo.hidden) return;
        panelArchivo.hidden = true;
        botonArchivo?.setAttribute("aria-expanded", "false");
    });

    fijarPeriodoReporte(clavePeriodoPredeterminadoReporte());
    renderizarArchivoReportes();
    $id("botonImprimirReportes")?.addEventListener("click", () => window.print());
    $id("botonVolverCamionesReporte")?.addEventListener("click", volverCamionesReportes);
    mostrarVehiculosReportes();

    if (intervaloCambioPeriodoReportes === null) {
        intervaloCambioPeriodoReportes = window.setInterval(() => {
            if (!vehiculoReporteActual || periodoArchivoSeleccionadoReportes) return;
            const periodoPredeterminado = clavePeriodoPredeterminadoReporte();
            const datosPeriodo = datosPeriodoDesdeClave(periodoPredeterminado);
            if (!datosPeriodo) return;
            const mesEsperado = `${datosPeriodo.anio}-${String(datosPeriodo.mes).padStart(2, "0")}`;
            if (campoMes.value !== mesEsperado || campoQuincena.value !== String(datosPeriodo.quincena)) {
                fijarPeriodoReporte(periodoPredeterminado);
                renderizarArchivoReportes();
                renderizarReportes();
            }
        }, 60 * 1000);
    }
}

function crearCeldaReporte(etiqueta, valor, clase = "") {
    const celda = document.createElement("div");
    celda.className = "celda-resumen-reporte" + (clase ? " " + clase : "");
    const titulo = document.createElement("span");
    titulo.textContent = etiqueta;
    const monto = document.createElement("strong");
    monto.textContent = valor;
    celda.append(titulo, monto);
    return celda;
}

function fechaLocalISOFinanzasReporte(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    const texto = String(valor);
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fechaLocalFinanzas(fecha);
}

function clienteActivoEnPeriodoReporte(cliente, periodo) {
    const fechaAlta = fechaLocalISOFinanzasReporte(cliente.fechaRegistro);
    const fechaRetiro = fechaLocalISOFinanzasReporte(cliente.fechaRetiro);
    return (!fechaAlta || fechaAlta <= periodo.fechaFin) &&
        (!fechaRetiro || fechaRetiro >= periodo.fechaInicio);
}

function descuentosAdelantoHastaReporte(adelanto, fechaCorte) {
    const registros = Array.isArray(adelanto.registrosDescuento) && adelanto.registrosDescuento.length
        ? adelanto.registrosDescuento
        : (adelanto.quincenas || []).flatMap(cuota => {
            const descuentos = Object.entries(cuota.descuentos || {}).map(([fecha, monto]) => ({ fecha, monto }));
            if (descuentos.length) return descuentos;
            return cuota.fecha && Number(cuota.descuento) > 0
                ? [{ fecha: cuota.fecha, monto: cuota.descuento }]
                : [];
        });

    return registros.reduce((total, registro) => {
        const fechaDescuento = fechaLocalISOFinanzasReporte(registro.fecha);
        if (!fechaDescuento || fechaDescuento > fechaCorte) return total;
        return total + (Number(registro.monto) || 0);
    }, 0);
}

function calcularProduccionClienteReporte(vehiculo, cliente, periodo, produccion = leerProduccion()) {
    const claveCliente = crearClaveClienteProduccion(vehiculo.id, cliente.id);
    const produccionCliente = produccion[claveCliente] || {};
    const registro = produccionCliente[periodo.clave] || { litros: {} };
    const litrosPorFecha = registro.litros && typeof registro.litros === "object"
        ? registro.litros
        : {};
    const totalLitros = sumarLitrosPeriodo({ litros: litrosPorFecha });
    const precio = Number(cliente.precio) || 0;
    const totalProduccion = totalLitros * precio;
    return { claveCliente, litrosPorFecha, totalLitros, precio, totalProduccion };
}

function crearTarjetaReporte(vehiculo, cliente, periodo, datosEmpresa, finanzas, produccion) {
    const { claveCliente, litrosPorFecha, totalLitros, precio, totalProduccion } =
        calcularProduccionClienteReporte(vehiculo, cliente, periodo, produccion);

    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-reporte";

    const marca = document.createElement("div");
    marca.className = "marca-tarjeta-reporte";
    if (datosEmpresa.logo) {
        const logo = document.createElement("img");
        logo.src = datosEmpresa.logo;
        logo.alt = "";
        marca.appendChild(logo);
    }
    const nombreEmpresa = document.createElement("strong");
    nombreEmpresa.textContent = datosEmpresa.nombre;
    marca.appendChild(nombreEmpresa);
    tarjeta.appendChild(marca);

    const encabezado = document.createElement("div");
    encabezado.className = "periodo-tarjeta-reporte";
    const mes = document.createElement("strong");
    mes.textContent = `${NOMBRES_MESES[periodo.mes - 1].toUpperCase()} ${periodo.anio}`;
    const quincena = document.createElement("span");
    quincena.textContent = periodo.quincena === 1 ? "PRIMERA QUINCENA" : "SEGUNDA QUINCENA";
    encabezado.append(mes, quincena);
    tarjeta.appendChild(encabezado);

    const nombreCliente = document.createElement("div");
    nombreCliente.className = "cliente-tarjeta-reporte";
    nombreCliente.textContent = cliente.nombre;
    tarjeta.appendChild(nombreCliente);

    const calendario = document.createElement("div");
    calendario.className = "calendario-tarjeta-reporte";
    for (let dia = periodo.inicio.getDate(); dia <= periodo.fin.getDate(); dia++) {
        const fecha = new Date(periodo.anio, periodo.mes - 1, dia, 12);
        const fechaISO = fechaLocalISO(fecha);
        const casilla = document.createElement("div");
        casilla.className = "dia-tarjeta-reporte";
        const numero = document.createElement("strong");
        numero.textContent = String(dia);
        const nombreDia = document.createElement("span");
        nombreDia.textContent = NOMBRES_DIAS[fecha.getDay()].slice(0, 3);
        const valor = document.createElement("b");
        const litros = litrosPorFecha[fechaISO];
        valor.textContent = litros === undefined || litros === null || litros === ""
            ? ""
            : formatearLitros(litros);
        casilla.append(numero, nombreDia, valor);
        calendario.appendChild(casilla);
    }
    tarjeta.appendChild(calendario);

    const resumenProduccion = document.createElement("div");
    resumenProduccion.className = "total-produccion-tarjeta-reporte";
    resumenProduccion.append(
        crearCeldaReporte("TL", formatearLitros(totalLitros)),
        crearCeldaReporte("PRECIO", `S/ ${formatearPrecio(precio)}`),
        crearCeldaReporte("TOTAL", `S/ ${formatearPrecio(totalProduccion)}`)
    );
    tarjeta.appendChild(resumenProduccion);
    tarjeta.dataset.totalLitrosReporte = String(totalLitros);
    tarjeta.dataset.totalProduccionReporte = String(totalProduccion);

    const adelantos = (Array.isArray(finanzas[claveCliente]) ? finanzas[claveCliente] : [])
        .map(adelanto => {
            const fechaAdelanto = fechaLocalISOFinanzasReporte(adelanto.fecha);
            const monto = Number(adelanto.monto) || 0;
            const descuento = descuentosAdelantoHastaReporte(adelanto, periodo.fechaFin);
            const pagado = Boolean(adelanto.pagado || adelanto.fechaPago || (monto > 0 && descuento >= monto - 0.001));
            return { adelanto, fechaAdelanto, monto, descuento, pagado };
        })
        .filter(item => item.fechaAdelanto && item.fechaAdelanto <= periodo.fechaFin && !item.pagado);
    const resumenFinanzas = document.createElement("div");
    resumenFinanzas.className = "resumen-finanzas-tarjeta-reporte";
    const totalAdelantos = adelantos.reduce((suma, item) => suma + item.monto, 0);
    const totalDescuentos = adelantos.reduce((suma, item) => suma + item.descuento, 0);
    const pendiente = adelantos.reduce((suma, item) => suma + Math.max(0, item.monto - item.descuento), 0);
    if (totalAdelantos > 0) {
        resumenFinanzas.append(
            crearCeldaReporte("ADELANTO", `S/ ${formatearPrecio(totalAdelantos)}`),
            crearCeldaReporte("DESCUENTO", `S/ ${formatearPrecio(totalDescuentos)}`),
            crearCeldaReporte("PENDIENTE", `S/ ${formatearPrecio(pendiente)}`, "pendiente-reporte")
        );
    } else {
        tarjeta.classList.add("sin-adelanto");
    }
    tarjeta.appendChild(resumenFinanzas);
    return tarjeta;
}

function renderizarReportes() {
    const contenedor = $id("contenedorReportes");
    const campoMes = $id("mesReporte");
    const campoQuincena = $id("quincenaReporte");
    if (!contenedor || !campoMes?.value || !campoQuincena?.value) return;

    const [anio, mes] = campoMes.value.split("-").map(Number);
    const clavePeriodo = crearClavePeriodoProduccion(anio, mes, Number(campoQuincena.value));
    const periodo = datosPeriodoDesdeClave(clavePeriodo);
    contenedor.replaceChildren();
    if (!periodo) return;

    const datosEmpresa = {
        nombre: localStorage.getItem(CLAVE_NOMBRE)?.trim() || "CAMWEB",
        logo: localStorage.getItem(CLAVE_LOGO) || ""
    };
    const finanzas = leerAdelantosFinanzas();
    const produccion = leerProduccion();
    const reportes = [];
    const vehiculo = vehiculoReporteActual && leerVehiculos().find(
        item => String(item.id) === String(vehiculoReporteActual.id)
    );
    if (!vehiculo) {
        if (vehiculoReporteActual) volverCamionesReportes();
        return;
    }
    vehiculoReporteActual = vehiculo;
    const clientesHistoricos = [
        ...leerClientesDeVehiculo(vehiculo.id),
        ...leerClientesArchivadosReporte(vehiculo.id)
    ];
    clientesHistoricos.forEach(cliente => {
        if (!cliente || !clienteActivoEnPeriodoReporte(cliente, periodo)) return;
        if (cliente && cliente.id !== undefined && cliente.nombre) {
            const tarjeta = crearTarjetaReporte(vehiculo, cliente, periodo, datosEmpresa, finanzas, produccion);
            reportes.push(tarjeta);
        }
    });

    // El TP resume las tarjetas visibles: el camión seleccionado y la quincena mostrada.
    const totalLitrosGeneral = reportes.reduce(
        (suma, tarjeta) => suma + (Number(tarjeta.dataset.totalLitrosReporte) || 0),
        0
    );
    const indicadorTotalLitros = $id("totalLitrosReportes");
    if (indicadorTotalLitros) indicadorTotalLitros.textContent = `TP = ${formatearLitros(totalLitrosGeneral)} L`;

    const estado = $id("estadoReportes");
    if (!reportes.length) {
        if (estado) estado.textContent = "Este camión todavía no tiene clientes registrados.";
        return;
    }
    if (estado) estado.textContent = `${reportes.length} reportes de clientes para este camión.`;

    for (let inicio = 0; inicio < reportes.length; inicio += 10) {
        const pagina = document.createElement("div");
        pagina.className = "pagina-reportes";
        pagina.setAttribute("aria-label", `Hoja ${Math.floor(inicio / 10) + 1} de reportes`);
        reportes.slice(inicio, inicio + 10).forEach(reporte => pagina.appendChild(reporte));
        contenedor.appendChild(pagina);
    }
}

/* =========================================================
   PRODUCCIÓN: TOTAL DEL CLIENTE EN LA QUINCENA ACTUAL
========================================================= */

function obtenerTotalClienteQuincenaActual(idVehiculo, idCliente) {
    const claveActual = obtenerPeriodoActual();
    const datos = leerDatosQuincenaGuardados(
        idVehiculo,
        idCliente,
        claveActual
    );

    return sumarLitrosPeriodo(datos);
}

/* =========================================================
   PRODUCCIÓN: TARJETAS DE CAMIONES
========================================================= */

function mostrarVehiculosProduccion() {
    const contenedor = $id("listaVehiculosProduccion");
    if (!contenedor) return;

    const lista = leerVehiculos();
    contenedor.replaceChildren();

    if (lista.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "mensaje-sin-camiones";
        vacio.textContent = "Primero registra un camión en VEHÍCULOS.";
        contenedor.appendChild(vacio);
        return;
    }

    lista.forEach((vehiculo, indice) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-vehiculo tarjeta-produccion-camion";

        if (vehiculo.activo === false) tarjeta.classList.add("inactivo");

        const numero = document.createElement("h4");
        numero.className = "numero-camion";
        numero.textContent = "CAMIÓN " + (indice + 1);

        tarjeta.append(numero, crearIconoCamion());

        tarjeta.appendChild(crearDatoCamion(
            "Chofer: " + (vehiculo.chofer || "Sin chofer"),
            "nombre-chofer-camion"
        ));

        obtenerAyudantes(vehiculo).forEach((nombre, posicion) => {
            tarjeta.appendChild(crearDatoCamion(
                "Ayudante " + (posicion + 1) + ": " + nombre,
                "ayudantes-camion"
            ));
        });

        tarjeta.appendChild(crearDatoCamion(
            "Placa: " + (vehiculo.placa || "Sin placa"),
            "placa-camion"
        ));

        tarjeta.appendChild(crearDatoCamion(
            "Ruta: " + (vehiculo.ruta || "Sin ruta"),
            "ruta-camion"
        ));

        const acciones = document.createElement("div");
        acciones.className = "acciones-tarjeta-produccion";

        const botonIngresar = document.createElement("button");
        botonIngresar.type = "button";
        botonIngresar.className = "boton-ingresar-clientes";
        botonIngresar.textContent = "INGRESAR";
        botonIngresar.addEventListener(
            "click",
            () => ingresarClientesProduccion(vehiculo.id)
        );

        acciones.appendChild(botonIngresar);
        tarjeta.appendChild(acciones);
        contenedor.appendChild(tarjeta);
    });
}

/* =========================================================
   PRODUCCIÓN: INGRESAR AL CAMIÓN
========================================================= */

function mostrarVehiculosFinanzas() {
    const contenedor = $id("listaVehiculosFinanzas");
    if (!contenedor) return;

    const lista = leerVehiculos();
    contenedor.replaceChildren();

    if (lista.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "mensaje-sin-camiones";
        vacio.textContent = "Primero registra un camión en VEHÍCULOS.";
        contenedor.appendChild(vacio);
        return;
    }

    lista.forEach((vehiculo, indice) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-vehiculo tarjeta-produccion-camion";
        if (vehiculo.activo === false) tarjeta.classList.add("inactivo");

        const numero = document.createElement("h4");
        numero.className = "numero-camion";
        numero.textContent = "CAMIÓN " + (indice + 1);
        tarjeta.append(numero, crearIconoCamion());
        tarjeta.appendChild(crearDatoCamion(
            "Chofer: " + (vehiculo.chofer || "Sin chofer"),
            "nombre-chofer-camion"
        ));
        obtenerAyudantes(vehiculo).forEach((nombre, posicion) => {
            tarjeta.appendChild(crearDatoCamion(
                "Ayudante " + (posicion + 1) + ": " + nombre,
                "ayudantes-camion"
            ));
        });
        tarjeta.appendChild(crearDatoCamion(
            "Placa: " + (vehiculo.placa || "Sin placa"),
            "placa-camion"
        ));
        tarjeta.appendChild(crearDatoCamion(
            "Ruta: " + (vehiculo.ruta || "Sin ruta"),
            "ruta-camion"
        ));

        const acciones = document.createElement("div");
        acciones.className = "acciones-tarjeta-produccion";
        const botonIngresar = document.createElement("button");
        botonIngresar.type = "button";
        botonIngresar.className = "boton-ingresar-clientes";
        botonIngresar.textContent = "INGRESAR";
        botonIngresar.addEventListener("click", () => ingresarCamionFinanzas(vehiculo.id));
        acciones.appendChild(botonIngresar);
        tarjeta.appendChild(acciones);
        contenedor.appendChild(tarjeta);
    });
}

function ingresarCamionFinanzas(id) {
    vehiculoFinanzasActual = leerVehiculos().find(vehiculo => String(vehiculo.id) === String(id));
    if (!vehiculoFinanzasActual) return;

    const vehiculos = leerVehiculos();
    const numeroCamion = vehiculos.findIndex(vehiculo => String(vehiculo.id) === String(id)) + 1;
    const ayudantes = obtenerAyudantes(vehiculoFinanzasActual);
    const personal = [
        "Chofer: " + (vehiculoFinanzasActual.chofer || "Sin chofer"),
        "Ayudante: " + (ayudantes.length ? ayudantes.join(", ") : "Sin ayudante"),
        "Placa: " + (vehiculoFinanzasActual.placa || "Sin placa")
    ];
    $id("datosCamionFinanzas").textContent =
        "Camión " + numeroCamion + "\n" + personal.join(" · ") + "\nRuta: " + (vehiculoFinanzasActual.ruta || "Sin ruta");
    $id("buscarClienteFinanzas").value = "";
    $id("panelListaCamionesFinanzas").hidden = true;
    $id("panelClientesFinanzas").hidden = false;
    mensaje("estadoVozFinanzas", "");
    mostrarClientesFinanzas();
}

function volverListaCamionesFinanzas() {
    detenerVozFinanzas();
    vehiculoFinanzasActual = null;
    clienteFinanzasActual = null;
    if ($id("panelListaCamionesFinanzas")) $id("panelListaCamionesFinanzas").hidden = false;
    if ($id("panelClientesFinanzas")) $id("panelClientesFinanzas").hidden = true;
    if ($id("panelDetalleFinanzas")) $id("panelDetalleFinanzas").hidden = true;
    if ($id("buscarClienteFinanzas")) $id("buscarClienteFinanzas").value = "";
    mostrarVehiculosFinanzas();
}

function mostrarClientesFinanzas() {
    const contenedor = $id("listaClientesFinanzas");
    if (!contenedor || !vehiculoFinanzasActual) return;
    contenedor.replaceChildren();

    const clientes = leerClientesDeVehiculo(vehiculoFinanzasActual.id);
    const consulta = normalizarBusquedaAdmin($id("buscarClienteFinanzas")?.value || "");
    const datosFinanzas = leerAdelantosFinanzas();
    const filtrados = clientes
        .map((cliente, indice) => ({
            cliente,
            indice,
            estado: estadoListaClienteFinanzas(datosFinanzas, vehiculoFinanzasActual.id, cliente)
        }))
        .filter(item => normalizarBusquedaAdmin(item.cliente.nombre).includes(consulta))
        .sort((a, b) => {
            if (a.estado.grupo !== b.estado.grupo) return a.estado.grupo - b.estado.grupo;
            if (a.estado.grupo === 0) return b.estado.fechaOrden - a.estado.fechaOrden || a.indice - b.indice;
            return a.indice - b.indice;
        });
    $id("totalClientesFinanzas").textContent = filtrados.length + (filtrados.length === 1 ? " cliente" : " clientes");

    if (!filtrados.length) {
        const vacio = document.createElement("div");
        vacio.className = "lista-clientes-vacia";
        vacio.textContent = clientes.length ? "No se encontraron clientes con esa búsqueda." : "Este camión todavía no tiene clientes registrados.";
        contenedor.appendChild(vacio);
        return;
    }

    filtrados.forEach(({ cliente, estado }) => {
        const fila = document.createElement("article");
        fila.className = "fila-cliente-admin fila-cliente-produccion";
        const datos = document.createElement("div");
        datos.className = "datos-fila-cliente";
        const nombre = document.createElement("button");
        nombre.type = "button";
        nombre.className = "nombre-fila-cliente boton-nombre-produccion";
        nombre.textContent = cliente.nombre;
        nombre.addEventListener("click", () => abrirDetalleFinanzas(cliente));
        datos.appendChild(nombre);
        fila.appendChild(datos);
        if (estado.mostrar) {
            const indicador = document.createElement("span");
            indicador.className = "saldo-cliente-finanzas " + (estado.clase || "saldo-finanzas-pagado");
            indicador.textContent = estado.texto;
            fila.appendChild(indicador);
        }
        contenedor.appendChild(fila);
    });
}

function estadoListaClienteFinanzas(datosFinanzas, idVehiculo, cliente) {
    const clave = String(idVehiculo) + "::" + String(cliente.id);
    const adelantos = Array.isArray(datosFinanzas[clave]) ? datosFinanzas[clave] : [];
    const fechaNumero = valor => {
        const tiempo = new Date(valor || 0).getTime();
        return Number.isFinite(tiempo) ? tiempo : 0;
    };
    const registros = adelantos.map(adelanto => {
        const descuento = sumaDescuentosFinanzas(adelanto);
        const monto = Number(adelanto.monto) || 0;
        const pendiente = Math.max(0, monto - descuento);
        const fechaUltimoDescuento = Array.isArray(adelanto.registrosDescuento) && adelanto.registrosDescuento.length
            ? adelantoFechaMasRecienteFinanzas(adelanto.registrosDescuento)
            : null;
        const fechaPago = adelanto.fechaPago || fechaUltimoDescuento || adelanto.fecha;
        return { adelanto, monto, pendiente, fechaPago, fechaOrden: fechaNumero(adelanto.fecha) };
    });
    const pendientes = registros.filter(item => item.monto > 0 && item.pendiente > 0.001)
        .sort((a, b) => b.fechaOrden - a.fechaOrden);
    if (pendientes.length) {
        const actual = pendientes[0];
        const mitad = actual.monto / 2;
        const clase = actual.pendiente <= 50 ? "saldo-finanzas-verde"
            : actual.pendiente <= mitad ? "saldo-finanzas-naranja" : "saldo-finanzas-rojo";
        return {
            grupo: 0,
            fechaOrden: actual.fechaOrden,
            mostrar: true,
            clase,
            texto: "S/ " + actual.pendiente.toFixed(2)
        };
    }
    const ahora = Date.now();
    const ventanaPagado = 3 * 24 * 60 * 60 * 1000;
    const pagadosRecientes = registros.filter(item => {
        if (item.monto <= 0 || item.pendiente > 0.001) return false;
        const tiempoPago = fechaNumero(item.fechaPago);
        return tiempoPago > 0 && ahora - tiempoPago >= 0 && ahora - tiempoPago < ventanaPagado;
    }).sort((a, b) => fechaNumero(b.fechaPago) - fechaNumero(a.fechaPago));
    if (pagadosRecientes.length) {
        return {
            grupo: 0,
            fechaOrden: pagadosRecientes[0].fechaOrden,
            mostrar: true,
            clase: "saldo-finanzas-pagado",
            texto: "Pagado"
        };
    }
    return { grupo: 1, fechaOrden: 0, mostrar: false, texto: "" };
}

function adelantoFechaMasRecienteFinanzas(registros) {
    return registros.reduce((masReciente, registro) =>
        !masReciente || new Date(registro.fecha || 0) > new Date(masReciente.fecha || 0) ? registro : masReciente, null
    )?.fecha || null;
}

function leerAdelantosFinanzas() {
    try {
        if (localStorage.getItem(CLAVE_LIMPIEZA_FINANZAS_INICIAL) !== "1") {
            const datosIniciales = JSON.parse(localStorage.getItem(CLAVE_FINANZAS) || "{}");
            Object.values(datosIniciales).forEach(adelantos => {
                if (!Array.isArray(adelantos)) return;
                adelantos.forEach(adelanto => {
                    if (Number(adelanto.monto) === 100) adelanto.monto = 0;
                });
            });
            localStorage.setItem(CLAVE_FINANZAS, JSON.stringify(datosIniciales));
            localStorage.setItem(CLAVE_LIMPIEZA_FINANZAS_INICIAL, "1");
        }
        const datos = JSON.parse(localStorage.getItem(CLAVE_FINANZAS) || "{}");
        return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
    } catch (error) {
        console.error("No se pudieron leer los adelantos de Finanzas:", error);
        return {};
    }
}

function guardarAdelantosFinanzas(datos) {
    localStorage.setItem(CLAVE_FINANZAS, JSON.stringify(datos));
}

function claveClienteFinanzas() {
    return vehiculoFinanzasActual && clienteFinanzasActual
        ? String(vehiculoFinanzasActual.id) + "::" + String(clienteFinanzasActual.id)
        : "";
}

function fechaLocalFinanzas(fecha) {
    return fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0") + "-" + String(fecha.getDate()).padStart(2, "0");
}

function adelantosClienteFinanzas() {
    const datos = leerAdelantosFinanzas();
    let adelantos = datos[claveClienteFinanzas()] || [];
    let cambio = false;
    adelantos.forEach(adelanto => {
        adelanto.quincenas = Array.isArray(adelanto.quincenas) ? adelanto.quincenas : [];
        adelanto.quincenas.forEach(cuota => {
            if (!cuota.descuentos || typeof cuota.descuentos !== "object") {
                cuota.descuentos = {};
                cambio = true;
            }
        });
        if (adelanto.tipo === "variable" && adelanto.quincenas.length === 0) {
            adelanto.quincenas = Array.from({ length: 6 }, () => ({ fecha: null, descuento: null, descuentos: {} }));
            cambio = true;
        }
        if (!Array.isArray(adelanto.registrosDescuento)) {
            const registros = [];
            if (Number(adelanto.descuentoRegistrado) > 0) {
                registros.push({ id: String(Date.now()) + "-migrado", monto: Number(adelanto.descuentoRegistrado), fecha: new Date().toISOString() });
            } else {
                (adelanto.quincenas || []).forEach(cuota => {
                    Object.entries(cuota.descuentos || {}).forEach(([fecha, monto]) => {
                        if (Number(monto) > 0) registros.push({ id: String(Date.now()) + "-" + fecha + "-" + registros.length, monto: Number(monto), fecha: new Date(fecha + "T12:00:00").toISOString() });
                    });
                });
            }
            adelanto.registrosDescuento = registros;
            cambio = true;
        }
        const cantidadMinima = adelanto.tipo === "variable"
            ? cantidadCuadrosVariableFinanzas(adelanto.registrosDescuento.length)
            : adelanto.registrosDescuento.length;
        while (adelanto.quincenas.length < cantidadMinima) {
            adelanto.quincenas.push({ fecha: null, descuento: null, descuentos: {} });
            cambio = true;
        }
        if (!adelanto.pagado && Number(adelanto.monto) > 0 && sumaDescuentosFinanzas(adelanto) >= Number(adelanto.monto) - 0.001) {
            marcarAdelantoPagadoFinanzas(adelanto);
            cambio = true;
        }
    });
    if (cambio) {
        datos[claveClienteFinanzas()] = adelantos;
        guardarAdelantosFinanzas(datos);
    }
    return adelantos;
}

function sumaDescuentosFinanzas(adelanto) {
    if (Array.isArray(adelanto.registrosDescuento)) {
        return adelanto.registrosDescuento.reduce((total, registro) => total + (Number(registro.monto) || 0), 0);
    }
    if (Number.isFinite(Number(adelanto.descuentoRegistrado))) return Number(adelanto.descuentoRegistrado);
    return (adelanto.quincenas || []).reduce((total, cuota) => total +
        Object.values(cuota.descuentos || {}).reduce((suma, monto) => suma + (Number(monto) || 0), 0), 0);
}

function marcarAdelantoPagadoFinanzas(adelanto) {
    adelanto.pagado = true;
    adelanto.fechaPago = new Date().toISOString();
}

function cantidadCuadrosVariableFinanzas(cantidadDescuentos) {
    if (cantidadDescuentos < 4) return 6;
    return (Math.floor((cantidadDescuentos - 4) / 6) + 2) * 6;
}

function crearQuincenasFinanzas(cantidad, registros = []) {
    const quincenas = Array.from({ length: cantidad }, () => ({ fecha: null, descuento: null, descuentos: {} }));
    registros.slice(0, cantidad).forEach((registro, indice) => {
        const fecha = new Date(registro.fecha);
        const fechaISO = Number.isNaN(fecha.getTime()) ? "" : fechaLocalFinanzas(fecha);
        quincenas[indice] = {
            fecha: registro.fecha,
            descuento: Number(registro.monto) || 0,
            descuentos: fechaISO ? { [fechaISO]: Number(registro.monto) || 0 } : {}
        };
    });
    return quincenas;
}

function abrirDetalleFinanzas(cliente) {
    clienteFinanzasActual = cliente;
    adelantoFinanzasEnEdicion = null;
    modoEdicionDescuentosFinanzas = false;
    modoEdicionAdelantoFinanzas = false;
    adelantoFinanzasSeleccionadoId = null;
    const camionNumero = leerVehiculos().findIndex(item => String(item.id) === String(vehiculoFinanzasActual.id)) + 1;
    $id("datosClienteFinanzas").textContent = cliente.nombre + " · Camión " + camionNumero;
    $id("panelClientesFinanzas").hidden = true;
    $id("panelDetalleFinanzas").hidden = false;
    $id("montoAdelantoFinanzas").value = "";
    $id("quincenasAdelantoFinanzas").value = "";
    $id("tipoDescuentoFinanzas").value = "fijo";
    actualizarCampoQuincenasFinanzas();
    mensaje("mensajeAdelantoFinanzas", "");
    renderizarAdelantosFinanzas();
}

function volverClientesFinanzas() {
    clienteFinanzasActual = null;
    if ($id("panelDetalleFinanzas")) $id("panelDetalleFinanzas").hidden = true;
    if ($id("panelClientesFinanzas")) $id("panelClientesFinanzas").hidden = false;
    mostrarClientesFinanzas();
}

function registrarAdelantoFinanzas(evento) {
    evento.preventDefault();
    if (!clienteFinanzasActual) return;
    const monto = Number($id("montoAdelantoFinanzas").value);
    const cantidad = Number($id("quincenasAdelantoFinanzas").value);
    const tipo = $id("tipoDescuentoFinanzas").value;
    if (!(monto > 0) || (tipo === "fijo" && (!Number.isInteger(cantidad) || cantidad < 1))) return;

    const datos = leerAdelantosFinanzas();
    const clave = claveClienteFinanzas();
    const fecha = new Date().toISOString();
    const nuevaCantidad = tipo === "fijo" ? cantidad : 6;
    const quincenas = crearQuincenasFinanzas(nuevaCantidad);
    datos[clave] = Array.isArray(datos[clave]) ? datos[clave] : [];
    if (adelantoFinanzasEnEdicion) {
        const existente = datos[clave].find(item => String(item.id) === String(adelantoFinanzasEnEdicion));
        if (existente) {
            const descuentoActual = sumaDescuentosFinanzas(existente);
            if (monto + 0.001 < descuentoActual) {
                alert("El adelanto no puede ser menor que los descuentos registrados.");
                return;
            }
            const registros = Array.isArray(existente.registrosDescuento) ? existente.registrosDescuento : [];
            if (tipo === "fijo" && cantidad < registros.length) {
                alert("El número de quincenas no puede ser menor que los descuentos ya registrados.");
                return;
            }
            if (monto <= descuentoActual + 0.001) {
                datos[clave] = datos[clave].filter(item => String(item.id) !== String(existente.id));
                adelantoFinanzasSeleccionadoId = null;
                adelantoFinanzasEnEdicion = null;
                modoEdicionDescuentosFinanzas = false;
                guardarAdelantosFinanzas(datos);
                $id("formularioAdelantoFinanzas").reset();
                actualizarCampoQuincenasFinanzas();
                mensaje("mensajeAdelantoFinanzas", "Adelanto pagado. El registro se limpió para un próximo adelanto.");
                renderizarAdelantosFinanzas();
                return;
            }
            existente.monto = Number(monto.toFixed(2));
            existente.tipo = tipo;
            const cantidadFinal = tipo === "variable" ? cantidadCuadrosVariableFinanzas(registros.length) : cantidad;
            existente.quincenas = crearQuincenasFinanzas(cantidadFinal, registros);
        }
        adelantoFinanzasEnEdicion = null;
    } else {
        const nuevo = { id: String(Date.now()), monto: Number(monto.toFixed(2)), tipo, fecha, quincenas, registrosDescuento: [] };
        datos[clave].push(nuevo);
        adelantoFinanzasSeleccionadoId = nuevo.id;
    }
    modoEdicionDescuentosFinanzas = false;
    try {
        guardarAdelantosFinanzas(datos);
        $id("formularioAdelantoFinanzas").reset();
        actualizarCampoQuincenasFinanzas();
        mensaje("mensajeAdelantoFinanzas", "Adelanto registrado.");
        renderizarAdelantosFinanzas();
    } catch (error) {
        console.error("No se pudo guardar el adelanto:", error);
        mensaje("mensajeAdelantoFinanzas", "No se pudo guardar el adelanto.");
    }
}

function renderizarAdelantosFinanzas() {
    const zona = $id("tablasAdelantosFinanzas");
    if (!zona || !clienteFinanzasActual) return;
    zona.replaceChildren();
    const adelantos = adelantosClienteFinanzas();
    if (!adelantos.some(item => String(item.id) === String(adelantoFinanzasSeleccionadoId))) {
        adelantoFinanzasSeleccionadoId = adelantos.length ? adelantos[adelantos.length - 1].id : null;
    }
    const panelDescuento = $id("panelRegistroDescuentoFinanzas");
    const activo = Boolean(adelantoFinanzasSeleccionadoId);
    if (panelDescuento) panelDescuento.classList.toggle("tiene-adelanto-seleccionado", activo);
    const seleccionado = adelantos.find(item => String(item.id) === String(adelantoFinanzasSeleccionadoId));
    const botonGuardarDescuento = $id("botonGuardarDescuentoFinanzas");
    const botonEliminar = $id("botonEliminarFinanzas");
    if (botonGuardarDescuento) botonGuardarDescuento.textContent = modoEdicionDescuentosFinanzas || modoEdicionAdelantoFinanzas ? "GUARDAR CAMBIOS" : "GUARDAR";
    const adelantoPagado = Boolean(seleccionado?.pagado);
    if (botonEliminar) botonEliminar.disabled = Boolean(seleccionado && sumaDescuentosFinanzas(seleccionado) > 0);
    if (botonGuardarDescuento) botonGuardarDescuento.disabled = adelantoPagado && !modoEdicionAdelantoFinanzas;
    const campoRegistroDescuento = $id("montoDescuentoFinanzas");
    if (campoRegistroDescuento) campoRegistroDescuento.disabled = adelantoPagado && !modoEdicionAdelantoFinanzas;
    const tabla = document.createElement("table");
    tabla.className = "tabla-resumen-adelantos-finanzas";
    tabla.innerHTML = "<thead><tr><th>Adelanto</th><th>Tipo de descuento</th><th>N.º de quincenas</th><th>Descuento</th><th>Pendiente</th></tr></thead>";
    const cuerpo = document.createElement("tbody");
    if (!adelantos.length) {
        const fila = document.createElement("tr");
        for (let columna = 0; columna < 5; columna++) {
            const celda = document.createElement("td");
            const espacio = document.createElement("span");
            espacio.className = "espacio-celda-finanzas espacio-vacio-finanzas";
            espacio.setAttribute("aria-hidden", "true");
            celda.appendChild(espacio);
            fila.appendChild(celda);
        }
        cuerpo.appendChild(fila);
    }
    adelantos.forEach(adelanto => {
        const descuento = sumaDescuentosFinanzas(adelanto);
        const pendiente = Math.max(0, Number(adelanto.monto) - descuento);
        const valores = ["S/ " + Number(adelanto.monto).toFixed(2), adelanto.tipo === "fijo" ? "Fijo" : "Variable", adelanto.tipo === "fijo" ? (adelanto.quincenas?.length || 0) : "Indefinido"];
        const fila = document.createElement("tr");
        fila.classList.toggle("adelanto-seleccionado-finanzas", String(adelanto.id) === String(adelantoFinanzasSeleccionadoId));
        fila.tabIndex = 0;
        fila.setAttribute("aria-label", "Seleccionar adelanto de S/ " + Number(adelanto.monto).toFixed(2));
        fila.addEventListener("click", () => seleccionarAdelantoFinanzas(adelanto.id));
        valores.forEach((valor, indice) => {
            const celda = document.createElement("td");
            const estaEditandoEstaFila = modoEdicionAdelantoFinanzas && String(adelanto.id) === String(adelantoFinanzasSeleccionadoId);
            if (estaEditandoEstaFila && indice < 3) {
                let campo;
                if (indice === 1) {
                    campo = document.createElement("select");
                    campo.innerHTML = '<option value="fijo">Fijo</option><option value="variable">Variable</option>';
                    campo.value = adelanto.tipo;
                    campo.addEventListener("change", () => {
                        const celdaQuincenas = campo.closest("tr")?.cells[2];
                        if (!celdaQuincenas) return;
                        celdaQuincenas.replaceChildren();
                        if (campo.value === "fijo") {
                            const entradaQuincenas = document.createElement("input");
                            entradaQuincenas.type = "number";
                            entradaQuincenas.min = String(Math.max(1, (adelanto.registrosDescuento || []).length));
                            entradaQuincenas.step = "1";
                            entradaQuincenas.value = String(Math.max(adelanto.quincenas?.length || 1, (adelanto.registrosDescuento || []).length));
                            entradaQuincenas.dataset.campo = "quincenas";
                            entradaQuincenas.className = "campo-edicion-adelanto-finanzas";
                            entradaQuincenas.addEventListener("click", evento => evento.stopPropagation());
                            celdaQuincenas.appendChild(entradaQuincenas);
                        } else {
                            const indefinido = document.createElement("span");
                            indefinido.className = "campo-edicion-adelanto-finanzas";
                            indefinido.textContent = "Indefinido";
                            celdaQuincenas.appendChild(indefinido);
                        }
                    });
                } else if (indice === 0) {
                    campo = document.createElement("input");
                    campo.type = "number";
                    campo.min = "0.01";
                    campo.step = "0.01";
                    campo.value = Number(adelanto.monto).toFixed(2);
                    campo.dataset.campo = "monto";
                } else if (adelanto.tipo === "fijo") {
                    campo = document.createElement("input");
                    campo.type = "number";
                    campo.min = String(Math.max(1, (adelanto.registrosDescuento || []).length));
                    campo.step = "1";
                    campo.value = String(adelanto.quincenas?.length || 1);
                    campo.dataset.campo = "quincenas";
                } else {
                    campo = document.createElement("span");
                    campo.textContent = "Indefinido";
                }
                campo.classList.add("campo-edicion-adelanto-finanzas");
                campo.addEventListener("click", evento => evento.stopPropagation());
                celda.appendChild(campo);
            } else {
                const espacio = document.createElement("span");
                espacio.className = "espacio-celda-finanzas";
                espacio.textContent = valor;
                celda.appendChild(espacio);
            }
            fila.appendChild(celda);
        });
        const celdaDescuento = document.createElement("td");
        const espacioDescuento = document.createElement("span");
        espacioDescuento.className = "espacio-celda-finanzas";
        espacioDescuento.textContent = "S/ " + descuento.toFixed(2);
        celdaDescuento.appendChild(espacioDescuento);
        fila.appendChild(celdaDescuento);
        const celdaPendiente = document.createElement("td");
        celdaPendiente.className = "pendiente-adelanto-finanzas";
        const espacioPendiente = document.createElement("span");
        espacioPendiente.className = "espacio-celda-finanzas";
        espacioPendiente.textContent = adelanto.pagado ? "Pagado" : "S/ " + pendiente.toFixed(2);
        celdaPendiente.appendChild(espacioPendiente);
        fila.appendChild(celdaPendiente);
        cuerpo.appendChild(fila);
    });
    tabla.appendChild(cuerpo);
    zona.appendChild(tabla);

    if (!seleccionado) return;
    if (panelDescuento) panelDescuento.hidden = false;
    if (seleccionado.pagado && !modoEdicionAdelantoFinanzas && !modoEdicionDescuentosFinanzas) return;
    const encabezadoDetalle = document.createElement("h3");
    encabezadoDetalle.className = "titulo-tabla-descuentos-finanzas";
    encabezadoDetalle.textContent = "DETALLE DE DESCUENTOS";
    zona.appendChild(encabezadoDetalle);
    const rejilla = document.createElement("div");
    rejilla.className = "rejilla-descuentos-finanzas";
    const registros = seleccionado.registrosDescuento || [];
    (seleccionado.quincenas || []).forEach((cuota, indice) => {
        const registro = registros[indice];
        const tarjeta = document.createElement("div");
        tarjeta.className = "cuadro-descuento-finanzas" + (registro ? " descuento-completado-finanzas" : "");
        const fecha = registro ? new Date(registro.fecha) : null;
        const mes = document.createElement("strong");
        mes.className = "mes-descuento-finanzas";
        mes.textContent = fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString("es-PE", { month: "long" }).toUpperCase() : "";
        const fechaTexto = document.createElement("span");
        fechaTexto.className = "fecha-descuento-finanzas";
        fechaTexto.textContent = fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
        const etiqueta = document.createElement("span");
        etiqueta.className = "etiqueta-descuento-finanzas";
        etiqueta.textContent = "Descuento";
        tarjeta.append(mes, fechaTexto, etiqueta);
        if (registro && modoEdicionDescuentosFinanzas) {
            const entrada = document.createElement("input");
            entrada.type = "number";
            entrada.min = "0";
            entrada.step = "0.01";
            entrada.value = Number(registro.monto).toFixed(2);
            entrada.className = "entrada-edicion-descuento-finanzas";
            entrada.dataset.indice = String(indice);
            entrada.setAttribute("aria-label", "Editar descuento de " + (fechaTexto.textContent || "esta quincena"));
            tarjeta.appendChild(entrada);
        } else {
            const monto = document.createElement("span");
            monto.className = "monto-descuento-finanzas";
            monto.textContent = registro ? "S/ " + Number(registro.monto).toFixed(2) : "";
            tarjeta.appendChild(monto);
        }
        rejilla.appendChild(tarjeta);
    });
    zona.appendChild(rejilla);
}

function seleccionarAdelantoFinanzas(id) {
    adelantoFinanzasSeleccionadoId = id;
    modoEdicionDescuentosFinanzas = false;
    modoEdicionAdelantoFinanzas = false;
    adelantoFinanzasEnEdicion = null;
    if ($id("montoDescuentoFinanzas")) $id("montoDescuentoFinanzas").value = "";
    renderizarAdelantosFinanzas();
}

function guardarDescuentoSeleccionadoFinanzas() {
    if (!adelantoFinanzasSeleccionadoId) return;
    const datos = leerAdelantosFinanzas();
    const clave = claveClienteFinanzas();
    const adelantos = datos[clave] || [];
    const adelanto = adelantos.find(item => String(item.id) === String(adelantoFinanzasSeleccionadoId));
    if (!adelanto) return;
    adelanto.registrosDescuento = Array.isArray(adelanto.registrosDescuento) ? adelanto.registrosDescuento : [];
    adelanto.quincenas = Array.isArray(adelanto.quincenas) ? adelanto.quincenas : [];

    if (modoEdicionDescuentosFinanzas && !modoEdicionAdelantoFinanzas) {
        const entradas = Array.from(document.querySelectorAll(".entrada-edicion-descuento-finanzas"));
        const editados = adelanto.registrosDescuento.map((registro, indice) => {
            const entrada = entradas.find(campo => Number(campo.dataset.indice) === indice);
            const texto = String(entrada?.value ?? registro.monto).trim().replace(",", ".");
            return { ...registro, monto: texto === "" ? NaN : Number(texto) };
        });
        const totalEditado = editados.reduce((total, registro) => total + (Number(registro.monto) || 0), 0);
        if (editados.some(registro => !Number.isFinite(registro.monto) || registro.monto < 0) ||
            totalEditado > Number(adelanto.monto) + 0.001) {
            alert("El total de descuentos no puede superar el monto del adelanto.");
            return;
        }
        if (totalEditado >= Number(adelanto.monto) - 0.001) {
            adelanto.registrosDescuento = editados.filter(registro => registro.monto > 0);
            adelanto.quincenas = crearQuincenasFinanzas(adelanto.quincenas.length, adelanto.registrosDescuento);
            marcarAdelantoPagadoFinanzas(adelanto);
            modoEdicionDescuentosFinanzas = false;
            guardarAdelantosFinanzas(datos);
            renderizarAdelantosFinanzas();
            return;
        }
        adelanto.registrosDescuento = editados.filter(registro => registro.monto > 0);
        delete adelanto.pagado;
        delete adelanto.fechaPago;
        const cantidadQuincenas = adelanto.tipo === "variable"
            ? cantidadCuadrosVariableFinanzas(adelanto.registrosDescuento.length)
            : Math.max(adelanto.quincenas.length, adelanto.registrosDescuento.length);
        adelanto.quincenas = crearQuincenasFinanzas(cantidadQuincenas, adelanto.registrosDescuento);
        modoEdicionDescuentosFinanzas = false;
        guardarAdelantosFinanzas(datos);
        renderizarAdelantosFinanzas();
        return;
    }

    if (modoEdicionAdelantoFinanzas) {
        const fila = Array.from(document.querySelectorAll(".tabla-resumen-adelantos-finanzas tbody tr"))
            .find(item => item.classList.contains("adelanto-seleccionado-finanzas"));
        const tipo = fila?.querySelector("select.campo-edicion-adelanto-finanzas")?.value || adelanto.tipo;
        const montoTexto = String(fila?.querySelector('input[data-campo="monto"]')?.value ?? adelanto.monto).trim().replace(",", ".");
        const monto = montoTexto === "" ? NaN : Number(montoTexto);
        const quincenasTexto = String(fila?.querySelector('input[data-campo="quincenas"]')?.value ?? adelanto.quincenas.length).trim();
        const quincenas = quincenasTexto === "" ? NaN : Number(quincenasTexto);
        const entradas = Array.from(document.querySelectorAll(".entrada-edicion-descuento-finanzas"));
        const editados = adelanto.registrosDescuento.map((registro, indice) => {
            const entrada = entradas.find(campo => Number(campo.dataset.indice) === indice);
            const texto = String(entrada?.value ?? registro.monto).trim().replace(",", ".");
            return { ...registro, monto: texto === "" ? NaN : Number(texto) };
        });
        const registrosFinales = editados.filter(registro => Number.isFinite(registro.monto) && registro.monto > 0);
        const descuentos = registrosFinales.reduce((total, registro) => total + registro.monto, 0);
        if (editados.some(registro => !Number.isFinite(registro.monto) || registro.monto < 0)) {
            alert("Cada descuento debe ser cero o mayor.");
            return;
        }
        if (!Number.isFinite(monto) || monto <= 0 || monto + 0.001 < descuentos) {
            alert("El adelanto debe ser mayor que cero y no puede ser menor que los descuentos registrados.");
            return;
        }
        if (tipo === "fijo" && (!Number.isInteger(quincenas) || quincenas < Math.max(1, registrosFinales.length))) {
            alert("El número de quincenas no puede ser menor que los descuentos registrados.");
            return;
        }
        adelanto.registrosDescuento = registrosFinales;
        adelanto.monto = Number(monto.toFixed(2));
        adelanto.tipo = tipo;
        const cantidad = tipo === "variable" ? cantidadCuadrosVariableFinanzas(registrosFinales.length) : quincenas;
        adelanto.quincenas = crearQuincenasFinanzas(cantidad, adelanto.registrosDescuento);
        if (descuentos >= monto - 0.001) {
            marcarAdelantoPagadoFinanzas(adelanto);
        } else {
            delete adelanto.pagado;
            delete adelanto.fechaPago;
        }
        modoEdicionAdelantoFinanzas = false;
        modoEdicionDescuentosFinanzas = false;
        guardarAdelantosFinanzas(datos);
        renderizarAdelantosFinanzas();
        return;
    }

    const valor = $id("montoDescuentoFinanzas").value;
    const texto = String(valor).trim().replace(",", ".");
    const monto = texto === "" ? NaN : Number(texto);
    const descuentoActual = sumaDescuentosFinanzas(adelanto);
    const pendiente = Number(adelanto.monto) - descuentoActual;
    if (!Number.isFinite(monto) || monto <= 0 || monto > pendiente + 0.001) {
        alert("El descuento debe ser mayor que cero y no puede superar el pendiente de S/ " + Math.max(0, pendiente).toFixed(2) + ".");
        return;
    }
    if (adelanto.registrosDescuento.length >= adelanto.quincenas.length) {
        alert("No quedan quincenas disponibles para registrar este descuento.");
        return;
    }

    const fecha = new Date().toISOString();
    const indice = adelanto.registrosDescuento.length;
    const descuento = Number(monto.toFixed(2));
    adelanto.registrosDescuento.push({ id: String(Date.now()), monto: descuento, fecha });
    if (descuentoActual + descuento >= Number(adelanto.monto) - 0.001) {
        marcarAdelantoPagadoFinanzas(adelanto);
        modoEdicionDescuentosFinanzas = false;
        guardarAdelantosFinanzas(datos);
        if ($id("montoDescuentoFinanzas")) $id("montoDescuentoFinanzas").value = "";
        renderizarAdelantosFinanzas();
        return;
    }
    const fechaISO = fechaLocalFinanzas(new Date(fecha));
    adelanto.quincenas[indice] = { fecha, descuento, descuentos: { [fechaISO]: descuento } };
    if (adelanto.tipo === "variable" && Number(adelanto.monto) - sumaDescuentosFinanzas(adelanto) > 0) {
        const umbralNuevaFila = Math.floor((adelanto.quincenas.length - 1) / 6) * 6 + 4;
        if (adelanto.registrosDescuento.length >= umbralNuevaFila) {
            adelanto.quincenas.push(...Array.from({ length: 6 }, () => ({ fecha: null, descuento: null, descuentos: {} })));
        }
    }
    guardarAdelantosFinanzas(datos);
    if ($id("montoDescuentoFinanzas")) $id("montoDescuentoFinanzas").value = "";
    renderizarAdelantosFinanzas();
}

function editarAdelantoSeleccionadoFinanzas() {
    const adelanto = adelantosClienteFinanzas().find(item => String(item.id) === String(adelantoFinanzasSeleccionadoId));
    if (adelanto) editarAdelantoFinanzas(adelanto);
}

function eliminarAdelantoSeleccionadoFinanzas() {
    if (!adelantoFinanzasSeleccionadoId) return;
    const id = adelantoFinanzasSeleccionadoId;
    adelantoFinanzasSeleccionadoId = null;
    adelantoFinanzasEnEdicion = null;
    modoEdicionDescuentosFinanzas = false;
    modoEdicionAdelantoFinanzas = false;
    eliminarAdelantoFinanzas(id);
}

function editarAdelantoFinanzas(adelanto) {
    adelantoFinanzasSeleccionadoId = adelanto.id;
    adelantoFinanzasEnEdicion = null;
    modoEdicionDescuentosFinanzas = true;
    modoEdicionAdelantoFinanzas = true;
    if ($id("montoDescuentoFinanzas")) $id("montoDescuentoFinanzas").value = "";
    renderizarAdelantosFinanzas();
}

function eliminarAdelantoFinanzas(id) {
    const datos = leerAdelantosFinanzas();
    const clave = claveClienteFinanzas();
    const candidato = (datos[clave] || []).find(item => String(item.id) === String(id));
    if (!candidato || sumaDescuentosFinanzas(candidato) > 0) return;
    datos[clave] = (datos[clave] || []).filter(item => String(item.id) !== String(id));
    if (String(adelantoFinanzasEnEdicion) === String(id)) adelantoFinanzasEnEdicion = null;
    guardarAdelantosFinanzas(datos);
    renderizarAdelantosFinanzas();
}

function actualizarCampoQuincenasFinanzas() {
    const fijo = $id("tipoDescuentoFinanzas")?.value === "fijo";
    const campo = $id("campoQuincenasFinanzas");
    const entrada = $id("quincenasAdelantoFinanzas");
    if (campo) campo.hidden = !fijo;
    if (entrada) {
        entrada.required = fijo;
        entrada.disabled = !fijo;
        if (!fijo) entrada.value = "";
    }
}

function alternarVozFinanzas() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        mensaje("estadoVozFinanzas", "Este navegador no admite búsqueda por voz.");
        return;
    }
    if (vozFinanzasActiva && reconocimientoVozFinanzas) {
        detenerVozFinanzas();
        return;
    }

    reconocimientoVozFinanzas = new SpeechRecognition();
    reconocimientoVozFinanzas.lang = "es-PE";
    reconocimientoVozFinanzas.continuous = false;
    reconocimientoVozFinanzas.interimResults = false;
    reconocimientoVozFinanzas.onstart = () => {
        vozFinanzasActiva = true;
        $id("botonMicrofonoFinanzas")?.classList.add("escuchando");
        mensaje("estadoVozFinanzas", "Escuchando el nombre del cliente...");
    };
    reconocimientoVozFinanzas.onresult = evento => {
        const transcripcion = evento.results?.[0]?.[0]?.transcript?.trim() || "";
        if (transcripcion) {
            $id("buscarClienteFinanzas").value = transcripcion;
            mostrarClientesFinanzas();
            mensaje("estadoVozFinanzas", "Búsqueda por voz: " + transcripcion);
        }
    };
    reconocimientoVozFinanzas.onerror = () => mensaje("estadoVozFinanzas", "No se pudo usar el micrófono. Inténtalo otra vez.");
    reconocimientoVozFinanzas.onend = detenerVozFinanzas;
    try {
        reconocimientoVozFinanzas.start();
    } catch (error) {
        console.error("No se pudo iniciar el micrófono de Finanzas:", error);
        mensaje("estadoVozFinanzas", "No se pudo iniciar el micrófono. Inténtalo otra vez.");
        detenerVozFinanzas();
    }
}

function detenerVozFinanzas() {
    if (reconocimientoVozFinanzas && vozFinanzasActiva) {
        try { reconocimientoVozFinanzas.stop(); } catch (error) { console.warn("El reconocimiento de voz de Finanzas ya estaba detenido.", error); }
    }
    vozFinanzasActiva = false;
    $id("botonMicrofonoFinanzas")?.classList.remove("escuchando");
}

function ingresarClientesProduccion(id) {
    const vehiculo = leerVehiculos().find(
        elemento => String(elemento.id) === String(id)
    );

    if (!vehiculo) {
        alert("No se encontró el camión seleccionado.");
        return;
    }

    detenerVozProduccion();
    vehiculoProduccionActual = vehiculo;
    clienteProduccionActual = null;
    periodoProduccionSeleccionado = null;
    edicionProduccionActiva = false;
    copiaEdicionProduccion = null;

    if ($id("panelListaCamionesProduccion")) {
        $id("panelListaCamionesProduccion").hidden = true;
    }

    if ($id("panelClientesProduccion")) {
        $id("panelClientesProduccion").hidden = false;
    }

    if ($id("panelTablasProduccion")) {
        $id("panelTablasProduccion").hidden = true;
    }

    if ($id("tituloClientesProduccion")) {
        $id("tituloClientesProduccion").textContent = "CLIENTES DEL CAMIÓN";
    }

    if ($id("datosClientesProduccion")) {
        const vehiculos = leerVehiculos();
        const indiceVehiculo = vehiculos.findIndex(
            elemento => String(elemento.id) === String(vehiculo.id)
        );
        const numeroCamion = indiceVehiculo >= 0 ? indiceVehiculo + 1 : 1;
        const ayudantes = [
            vehiculo.ayudante || vehiculo.nombreAyudante,
            vehiculo.ayudante2 || vehiculo.nombreAyudante2
        ].filter(Boolean);
        const personal = [
            "Chofer: " + (vehiculo.chofer || "Sin chofer"),
            "Ayudante: " + (ayudantes.length ? ayudantes.join(", ") : "Sin ayudante"),
            "Placa: " + (vehiculo.placa || "Sin placa")
        ];
        $id("datosClientesProduccion").textContent =
            "Camión " + numeroCamion + "\n" + personal.join(" · ") +
            "\nRuta: " + (vehiculo.ruta || "Sin ruta");
    }
    if ($id("buscarClienteProduccion")) {
        $id("buscarClienteProduccion").value = "";
    }

    mensaje("estadoVozProduccion", "");
    mostrarClientesProduccion();
}

function volverListaCamionesProduccion() {
    detenerVozProduccion();

    vehiculoProduccionActual = null;
    clienteProduccionActual = null;
    periodoProduccionSeleccionado = null;
    edicionProduccionActiva = false;
    copiaEdicionProduccion = null;

    if ($id("panelListaCamionesProduccion")) {
        $id("panelListaCamionesProduccion").hidden = false;
    }

    if ($id("panelClientesProduccion")) {
        $id("panelClientesProduccion").hidden = true;
    }

    if ($id("panelTablasProduccion")) {
        $id("panelTablasProduccion").hidden = true;
    }

    if ($id("buscarClienteProduccion")) {
        $id("buscarClienteProduccion").value = "";
    }

    mensaje("estadoVozProduccion", "");
    mostrarVehiculosProduccion();
}

function volverListaClientesProduccion() {
    if (edicionProduccionActiva) {
        const salir = confirm(
            "Tienes la producción en modo edición.\n\n" +
            "Si no has guardado, los cambios de esta edición se perderán.\n\n" +
            "¿Deseas regresar a los clientes?"
        );

        if (!salir) return;
    }

    detenerVozProduccion();
    clienteProduccionActual = null;
    periodoProduccionSeleccionado = null;
    edicionProduccionActiva = false;
    copiaEdicionProduccion = null;

    if ($id("panelTablasProduccion")) {
        $id("panelTablasProduccion").hidden = true;
    }

    if ($id("panelClientesProduccion")) {
        $id("panelClientesProduccion").hidden = false;
    }

    mostrarClientesProduccion();
}

/* =========================================================
   PRODUCCIÓN: LISTA DE CLIENTES
   - Muestra nombre y litros de la quincena actual.
   - No muestra el precio por litro debajo del nombre.
   - Al pulsar el nombre se abren sus tablas.
========================================================= */

function mostrarClientesProduccion() {
    const contenedor = $id("listaClientesProduccion");
    if (!contenedor) return;

    contenedor.replaceChildren();

    if (!vehiculoProduccionActual) {
        if ($id("totalLitrosGeneralProduccion")) $id("totalLitrosGeneralProduccion").textContent = "0 L";
        if ($id("totalClientesProduccion")) {
            $id("totalClientesProduccion").textContent = "0 clientes";
        }
        return;
    }

    const todos = leerClientesDeVehiculo(vehiculoProduccionActual.id);
    const totalGeneral = todos.reduce((suma, cliente) => suma + obtenerTotalClienteQuincenaActual(vehiculoProduccionActual.id, cliente.id), 0);
    if ($id("totalLitrosGeneralProduccion")) $id("totalLitrosGeneralProduccion").textContent = formatearLitros(totalGeneral) + " L";

    const consulta = normalizarBusquedaAdmin(
        $id("buscarClienteProduccion")?.value || ""
    );

    const filtrados = todos.filter(cliente =>
        normalizarBusquedaAdmin(cliente.nombre).includes(consulta)
    );

    if ($id("totalClientesProduccion")) {
        $id("totalClientesProduccion").textContent =
            filtrados.length +
            (filtrados.length === 1 ? " cliente" : " clientes");
    }

    if (filtrados.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "lista-clientes-vacia";

        vacio.textContent = todos.length === 0
            ? "Este camión todavía no tiene clientes registrados."
            : "No se encontraron clientes con esa búsqueda.";

        contenedor.appendChild(vacio);
        return;
    }

    filtrados.forEach(cliente => {
        const fila = document.createElement("article");
        fila.className = "fila-cliente-admin fila-cliente-produccion";

        const datos = document.createElement("div");
        datos.className = "datos-fila-cliente";

        const nombre = document.createElement("button");
        nombre.type = "button";
        nombre.className = "nombre-fila-cliente boton-nombre-produccion";
        nombre.textContent = cliente.nombre;
        nombre.title = "Abrir producción de " + cliente.nombre;

        nombre.addEventListener("click", () => {
            abrirTablasProduccionCliente(cliente.id);
        });

        datos.appendChild(nombre);

        const totalZona = document.createElement("div");
        totalZona.className = "total-cliente-lista-produccion";

        const etiquetaTotal = document.createElement("span");
        etiquetaTotal.className = "etiqueta-litros-cliente-produccion";
        etiquetaTotal.textContent = "TOTAL LITROS";

        const total = document.createElement("strong");
        total.className = "valor-litros-cliente-produccion";
        total.textContent = formatearLitros(
            obtenerTotalClienteQuincenaActual(
                vehiculoProduccionActual.id,
                cliente.id
            )
        ) + " L";

        totalZona.append(etiquetaTotal, total);

        fila.append(datos, totalZona);

        fila.addEventListener("click", evento => {
            if (evento.target.closest("button")) return;
            abrirTablasProduccionCliente(cliente.id);
        });

        contenedor.appendChild(fila);
    });
}


/* =========================================================
   PRODUCCIÓN: ABRIR TABLAS DE UN CLIENTE
========================================================= */

function abrirTablasProduccionCliente(idCliente) {
    if (!vehiculoProduccionActual) return;

    const cliente = leerClientesDeVehiculo(vehiculoProduccionActual.id)
        .find(elemento => String(elemento.id) === String(idCliente));

    if (!cliente) {
        alert("No se encontró el cliente seleccionado.");
        return;
    }

    detenerVozProduccion();

    clienteProduccionActual = cliente;
    periodoProduccionSeleccionado = obtenerPeriodoActual();
    edicionProduccionActiva = false;
    copiaEdicionProduccion = null;

    if ($id("panelClientesProduccion")) {
        $id("panelClientesProduccion").hidden = true;
    }

    if ($id("panelTablasProduccion")) {
        $id("panelTablasProduccion").hidden = false;
    }

    if ($id("nombreClienteTablasProduccion")) {
        $id("nombreClienteTablasProduccion").textContent = cliente.nombre;
    }

    if ($id("datosClienteTablasProduccion")) {
        $id("datosClienteTablasProduccion").textContent =
            "Precio por litro: S/ " + formatearPrecio(cliente.precio);
    }

    if ($id("datosCabeceraTablasProduccion")) {
        const vehiculos = leerVehiculos();
        const indiceVehiculo = vehiculos.findIndex(
            elemento => String(elemento.id) === String(vehiculoProduccionActual.id)
        );
        const numeroCamion = indiceVehiculo >= 0 ? indiceVehiculo + 1 : 1;
        const ayudantes = [
            vehiculoProduccionActual.ayudante || vehiculoProduccionActual.nombreAyudante,
            vehiculoProduccionActual.ayudante2 || vehiculoProduccionActual.nombreAyudante2
        ].filter(Boolean);
        const datosPersonal = [
            "Chofer: " + (vehiculoProduccionActual.chofer || "Sin chofer"),
            "Ayudante: " + (ayudantes.length ? ayudantes.join(", ") : "Sin ayudante"),
            "Placa: " + (vehiculoProduccionActual.placa || "Sin placa"),
        ];
        $id("datosCabeceraTablasProduccion").textContent =
            "Camión " + numeroCamion + "\n" + datosPersonal.join(" · ") +
            "\nRuta: " + (vehiculoProduccionActual.ruta || "Sin ruta");
    }
    mensaje("mensajeGuardarProduccion", "");
    renderizarTablasProduccion();
}

/* =========================================================
   PRODUCCIÓN: CREAR TABLA DE DÍAS DE UNA QUINCENA
========================================================= */

function crearTablaQuincena(clavePeriodo, modoHistorial) {
    const datosPeriodo = datosPeriodoDesdeClave(clavePeriodo);
    if (!datosPeriodo) return null;

    const idVehiculo = vehiculoProduccionActual.id;
    const idCliente = clienteProduccionActual.id;

    const periodoGuardado = leerDatosQuincenaGuardados(
        idVehiculo,
        idCliente,
        clavePeriodo
    );

    const tarjeta = document.createElement("section");
    tarjeta.className = "tarjeta-quincena-produccion";
    tarjeta.dataset.periodo = clavePeriodo;

    if (clavePeriodo === periodoProduccionSeleccionado) {
        tarjeta.classList.add("quincena-seleccionada");
    }

    if (modoHistorial) {
        tarjeta.classList.add("quincena-historica");
    }

    const encabezado = document.createElement("div");
    encabezado.className = "encabezado-tabla-quincena";
    const mesEncabezado = document.createElement("span");
    mesEncabezado.className = "mes-encabezado-quincena";
    mesEncabezado.textContent =
        NOMBRES_MESES[datosPeriodo.mes - 1].toUpperCase() + " " + datosPeriodo.anio;

    const nombreQuincena = document.createElement("span");
    nombreQuincena.className = "nombre-encabezado-quincena";
    nombreQuincena.textContent = datosPeriodo.quincena === 1
        ? "PRIMERA QUINCENA"
        : "SEGUNDA QUINCENA";

    encabezado.append(mesEncabezado, nombreQuincena);

    tarjeta.appendChild(encabezado);

    const tablaScroll = document.createElement("div");
    tablaScroll.className = "tabla-dias-scroll";

    const tabla = document.createElement("div");
    tabla.className = "rejilla-dias-produccion";
    tabla.style.gridTemplateColumns = "repeat(8, minmax(0, 1fr))";
    tabla.style.minWidth = "0";

    for (
        let dia = datosPeriodo.inicio.getDate();
        dia <= datosPeriodo.fin.getDate();
        dia++
    ) {
        const fecha = new Date(
            datosPeriodo.anio,
            datosPeriodo.mes - 1,
            dia,
            12,
            0,
            0
        );

        const fechaISO = fechaLocalISO(fecha);
        const nombreDia = NOMBRES_DIAS[fecha.getDay()];
        const valorGuardado = periodoGuardado.litros?.[fechaISO];

        const casilla = document.createElement("div");
        casilla.className = "casilla-dia-produccion";

        const encabezadoDia = document.createElement("div");
        encabezadoDia.className = "encabezado-dia-produccion";

        const numeroDia = document.createElement("strong");
        numeroDia.className = "numero-dia-produccion";
        numeroDia.textContent = String(dia);

        const nombreDiaElemento = document.createElement("span");
        nombreDiaElemento.className = "nombre-dia-produccion";
        nombreDiaElemento.textContent =
            nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);

        encabezadoDia.append(numeroDia, nombreDiaElemento);

        const etiquetaLitros = document.createElement("label");
        etiquetaLitros.className = "etiqueta-litros-dia";
        etiquetaLitros.textContent = "Leche (L)";

        const entrada = document.createElement("input");
        entrada.type = "number";
        entrada.className = "entrada-litros-produccion";
        entrada.min = "0";
        entrada.step = "0.01";
        entrada.inputMode = "decimal";
        entrada.dataset.fecha = fechaISO;
        entrada.setAttribute(
            "aria-label",
            "Litros del " + dia + " de " + NOMBRES_MESES[datosPeriodo.mes - 1]
        );

        entrada.value =
            valorGuardado === undefined || valorGuardado === null
                ? ""
                : String(valorGuardado);

        entrada.disabled = modoHistorial || !(
            edicionProduccionActiva &&
            clavePeriodo === periodoProduccionSeleccionado
        );

        entrada.addEventListener("input", () => {
            actualizarTotalVistaPrevia(clavePeriodo);
            actualizarResumenDeTabla(clavePeriodo);
        });

        casilla.append(encabezadoDia, etiquetaLitros, entrada);
        tabla.appendChild(casilla);
    }

    tablaScroll.appendChild(tabla);
    tarjeta.appendChild(tablaScroll);

    const pie = document.createElement("div");
    pie.className = "pie-tabla-quincena";

    const resumen = document.createElement("span");
    resumen.className = "resumen-quincena";
    resumen.dataset.resumenPeriodo = clavePeriodo;

    resumen.textContent =
        "Total guardado: " +
        formatearLitros(sumarLitrosPeriodo(periodoGuardado)) +
        " litros";

    pie.appendChild(resumen);
    tarjeta.appendChild(pie);

    return tarjeta;
}

/* =========================================================
   PRODUCCIÓN: RENDERIZAR LAS DOS QUINCENAS DEL MES
   - La quincena actual se selecciona automáticamente.
   - La otra quincena del mismo mes también queda visible.
   - Los meses anteriores aparecen en el historial.
========================================================= */

function renderizarTablasProduccion() {
    if (!vehiculoProduccionActual || !clienteProduccionActual) return;

    limpiarProduccionCaducada();

    const contenedorActual = $id("contenedorTablasQuincenas");
    const contenedorHistorial = $id("contenedorHistorialProduccion");

    if (!contenedorActual || !contenedorHistorial) return;

    contenedorActual.replaceChildren();
    contenedorHistorial.replaceChildren();

    const claveActual = obtenerPeriodoActual();
    if (periodoProduccionSeleccionado !== claveActual) {
        periodoProduccionSeleccionado = claveActual;
        edicionProduccionActiva = false;
        copiaEdicionProduccion = null;
    }

    const tablaActual = crearTablaQuincena(claveActual, false);
    if (tablaActual) contenedorActual.appendChild(tablaActual);

    const claveCliente = crearClaveClienteProduccion(
        vehiculoProduccionActual.id,
        clienteProduccionActual.id
    );

    const todos = limpiarProduccionCaducada();
    const periodosCliente = todos[claveCliente] || {};

    const inicioPeriodoActual = datosPeriodoDesdeClave(claveActual).inicio;

    const clavesAnteriores = obtenerClavesPeriodosAnteriores(
        claveActual,
        periodosCliente
    ).filter(clave => {
        const datos = datosPeriodoDesdeClave(clave);
        return datos &&
            datos.fin < inicioPeriodoActual &&
            periodoTieneRegistros(periodosCliente[clave]);
    });

    clavesAnteriores.forEach(clave => {
        const tabla = crearTablaQuincena(clave, true);
        if (tabla) contenedorHistorial.appendChild(tabla);
    });

    const seccionHistorial = $id("seccionHistorialProduccion");
    if (seccionHistorial) {
        seccionHistorial.hidden = clavesAnteriores.length === 0;
    }

    actualizarResumenPeriodoSeleccionado();
    actualizarEstadoBotonesProduccion();
}

/* =========================================================
   PRODUCCIÓN: SELECCIONAR UNA QUINCENA
========================================================= */

function seleccionarPeriodoProduccion(clavePeriodo, volverADibujar = true) {
    if (!datosPeriodoDesdeClave(clavePeriodo)) return;

    if (
        edicionProduccionActiva &&
        clavePeriodo !== periodoProduccionSeleccionado
    ) {
        const confirmarCambio = confirm(
            "Estás editando la quincena seleccionada.\n\n" +
            "Si cambias de quincena sin guardar, perderás los cambios " +
            "que todavía no has guardado.\n\n¿Deseas continuar?"
        );

        if (!confirmarCambio) return;

        restaurarCopiaEdicionProduccion();
    }

    periodoProduccionSeleccionado = clavePeriodo;
    edicionProduccionActiva = false;
    copiaEdicionProduccion = null;

    if (volverADibujar) {
        renderizarTablasProduccion();
    } else {
        actualizarResumenPeriodoSeleccionado();
        actualizarEstadoBotonesProduccion();
    }
}

/* =========================================================
   PRODUCCIÓN: ACTUALIZAR TOTAL DE LA TABLA EN EDICIÓN
========================================================= */

function actualizarTotalVistaPrevia(clavePeriodo) {
    if (clavePeriodo !== periodoProduccionSeleccionado) return;

    const contenedor = document.querySelector(
        `.tarjeta-quincena-produccion[data-periodo="${clavePeriodo}"]`
    );

    if (!contenedor) return;

    const entradas = contenedor.querySelectorAll(
        ".entrada-litros-produccion"
    );

    let total = 0;

    entradas.forEach(entrada => {
        const valor = Number(entrada.value);

        if (
            entrada.value.trim() !== "" &&
            Number.isFinite(valor) &&
            valor >= 0
        ) {
            total += valor;
        }
    });

    const totalElemento = $id("totalLitrosProduccion");

    if (totalElemento) {
        totalElemento.textContent = formatearLitros(total);
    }

    const periodoElemento = $id("periodoTotalProduccion");
    const datosPeriodo = datosPeriodoDesdeClave(clavePeriodo);

    if (periodoElemento && datosPeriodo) {
        periodoElemento.textContent = datosPeriodo.etiqueta;
    }
}

function actualizarResumenDeTabla(clavePeriodo) {
    const tarjeta = document.querySelector(
        `.tarjeta-quincena-produccion[data-periodo="${clavePeriodo}"]`
    );

    if (!tarjeta) return;

    const entradas = tarjeta.querySelectorAll(
        ".entrada-litros-produccion"
    );

    let total = 0;

    entradas.forEach(entrada => {
        const valor = Number(entrada.value);

        if (
            entrada.value.trim() !== "" &&
            Number.isFinite(valor) &&
            valor >= 0
        ) {
            total += valor;
        }
    });

    const resumen = tarjeta.querySelector(
        `[data-resumen-periodo="${clavePeriodo}"]`
    );

    if (resumen) {
        resumen.textContent =
            "Total de esta quincena: " +
            formatearLitros(total) + " litros";
    }
}

/* =========================================================
   PRODUCCIÓN: OBTENER TOTAL DE UNA QUINCENA
========================================================= */

function obtenerTotalPeriodoEnPantalla(clavePeriodo) {
    const tarjeta = document.querySelector(
        `.tarjeta-quincena-produccion[data-periodo="${clavePeriodo}"]`
    );

    if (tarjeta) {
        const entradas = tarjeta.querySelectorAll(
            ".entrada-litros-produccion"
        );

        let totalPantalla = 0;

        entradas.forEach(entrada => {
            const valor = Number(entrada.value);

            if (
                entrada.value.trim() !== "" &&
                Number.isFinite(valor) &&
                valor >= 0
            ) {
                totalPantalla += valor;
            }
        });

        return totalPantalla;
    }

    if (!vehiculoProduccionActual || !clienteProduccionActual) return 0;

    const datos = leerDatosQuincenaGuardados(
        vehiculoProduccionActual.id,
        clienteProduccionActual.id,
        clavePeriodo
    );

    return sumarLitrosPeriodo(datos);
}

/* =========================================================
   PRODUCCIÓN: RESUMEN Y TOTAL DE LA QUINCENA SELECCIONADA
========================================================= */

function actualizarResumenPeriodoSeleccionado() {
    if (!periodoProduccionSeleccionado) return;

    const datosPeriodo = datosPeriodoDesdeClave(
        periodoProduccionSeleccionado
    );

    if (!datosPeriodo) return;

    const total = obtenerTotalPeriodoEnPantalla(
        periodoProduccionSeleccionado
    );

    if ($id("totalLitrosProduccion")) {
        $id("totalLitrosProduccion").textContent = formatearLitros(total);
    }

    if ($id("periodoTotalProduccion")) {
        $id("periodoTotalProduccion").textContent =
            datosPeriodo.etiqueta;
    }
}

function actualizarEstadoBotonesProduccion() {
    const botonEditar = $id("botonEditarProduccion");
    const botonGuardar = $id("botonGuardarProduccion");

    if (botonEditar) {
        botonEditar.textContent = edicionProduccionActiva ? "✖️" : "✏️";
        botonEditar.title = edicionProduccionActiva
            ? "Cancelar edición"
            : "Editar producción";
        botonEditar.setAttribute(
            "aria-label",
            edicionProduccionActiva
                ? "Cancelar edición"
                : "Editar producción"
        );
    }

    if (botonGuardar) {
        botonGuardar.disabled = !edicionProduccionActiva;
    }
}

/* =========================================================
   PRODUCCIÓN: COPIA TEMPORAL PARA CANCELAR EDICIÓN
========================================================= */

function obtenerEntradasPeriodoActual() {
    if (!periodoProduccionSeleccionado) return {};

    const tarjeta = document.querySelector(
        `.tarjeta-quincena-produccion[data-periodo="${periodoProduccionSeleccionado}"]`
    );

    const resultado = {};

    if (!tarjeta) return resultado;

    tarjeta.querySelectorAll(".entrada-litros-produccion").forEach(entrada => {
        resultado[entrada.dataset.fecha] = entrada.value;
    });

    return resultado;
}

function guardarCopiaEdicionProduccion() {
    copiaEdicionProduccion = {
        periodo: periodoProduccionSeleccionado,
        valores: obtenerEntradasPeriodoActual()
    };
}

function restaurarCopiaEdicionProduccion() {
    if (!copiaEdicionProduccion) return;

    const copia = copiaEdicionProduccion;

    if (copia.periodo === periodoProduccionSeleccionado) {
        const tarjeta = document.querySelector(
            `.tarjeta-quincena-produccion[data-periodo="${copia.periodo}"]`
        );

        if (tarjeta) {
            tarjeta.querySelectorAll(
                ".entrada-litros-produccion"
            ).forEach(entrada => {
                entrada.value = copia.valores[entrada.dataset.fecha] ?? "";
            });
        }
    }

    copiaEdicionProduccion = null;
}

/* =========================================================
   PRODUCCIÓN: LÁPIZ PARA EDITAR
========================================================= */

function alternarEdicionProduccion() {
    if (!clienteProduccionActual || !periodoProduccionSeleccionado) return;

    if (edicionProduccionActiva) {
        const cancelar = confirm(
            "¿Deseas cancelar la edición?\n\n" +
            "Los cambios que todavía no guardaste se perderán."
        );

        if (!cancelar) return;

        restaurarCopiaEdicionProduccion();
        edicionProduccionActiva = false;
        copiaEdicionProduccion = null;

        mensaje("mensajeGuardarProduccion", "Edición cancelada.");
        renderizarTablasProduccion();
        return;
    }

    guardarCopiaEdicionProduccion();
    edicionProduccionActiva = true;

    mensaje(
        "mensajeGuardarProduccion",
        "Modo edición activado. Ingresa los litros y pulsa GUARDAR."
    );

    renderizarTablasProduccion();

    const tarjeta = document.querySelector(
        `.tarjeta-quincena-produccion[data-periodo="${periodoProduccionSeleccionado}"]`
    );

    const primeraEntrada = tarjeta?.querySelector(
        ".entrada-litros-produccion"
    );

    if (primeraEntrada) {
        primeraEntrada.focus();
    }
}

/* =========================================================
   PRODUCCIÓN: GUARDAR LITROS DE LA QUINCENA SELECCIONADA
========================================================= */

function guardarProduccionCliente() {
    if (!vehiculoProduccionActual || !clienteProduccionActual) {
        mensaje("mensajeGuardarProduccion", "Selecciona un cliente.");
        return;
    }

    if (!periodoProduccionSeleccionado) {
        mensaje("mensajeGuardarProduccion", "Selecciona una quincena.");
        return;
    }

    if (!edicionProduccionActiva) {
        mensaje(
            "mensajeGuardarProduccion",
            "Pulsa el lápiz antes de editar los litros."
        );
        return;
    }

    const tarjeta = document.querySelector(
        `.tarjeta-quincena-produccion[data-periodo="${periodoProduccionSeleccionado}"]`
    );

    if (!tarjeta) {
        mensaje(
            "mensajeGuardarProduccion",
            "No se encontró la tabla seleccionada."
        );
        return;
    }

    const datosPeriodo = datosPeriodoDesdeClave(
        periodoProduccionSeleccionado
    );

    if (!datosPeriodo) return;

    const litrosPorFecha = {};

    const entradas = tarjeta.querySelectorAll(
        ".entrada-litros-produccion"
    );

    for (const entrada of entradas) {
        const valorTexto = entrada.value.trim();

        if (valorTexto === "") continue;

        const valor = Number(valorTexto);

        if (!Number.isFinite(valor) || valor < 0) {
            mensaje(
                "mensajeGuardarProduccion",
                "Revisa los litros ingresados. No se permiten valores negativos."
            );
            entrada.focus();
            return;
        }

        litrosPorFecha[entrada.dataset.fecha] = Number(valor.toFixed(2));
    }

    try {
        const todos = limpiarProduccionCaducada();

        const claveCliente = crearClaveClienteProduccion(
            vehiculoProduccionActual.id,
            clienteProduccionActual.id
        );

        if (!todos[claveCliente]) {
            todos[claveCliente] = {};
        }

        todos[claveCliente][periodoProduccionSeleccionado] = {
            periodo: periodoProduccionSeleccionado,
            inicio: datosPeriodo.fechaInicio,
            fin: datosPeriodo.fechaFin,
            litros: litrosPorFecha,
            guardado: new Date().toISOString()
        };

        guardarTodosLosDatosProduccion(todos);

        edicionProduccionActiva = false;
        copiaEdicionProduccion = null;

        mensaje(
            "mensajeGuardarProduccion",
            "Producción guardada correctamente."
        );

        renderizarTablasProduccion();

        /* Actualiza el total que aparece junto al cliente. */
        mostrarClientesProduccion();
        if (vehiculoReporteActual) renderizarReportes();

    } catch (error) {
        console.error("Error al guardar la producción:", error);

        mensaje(
            "mensajeGuardarProduccion",
            "No se pudo guardar. Revisa el espacio disponible del navegador."
        );
    }
}

/* =========================================================
   PRODUCCIÓN: BÚSQUEDA POR VOZ
========================================================= */

function alternarVozProduccion() {
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        mensaje(
            "estadoVozProduccion",
            "El navegador no admite búsqueda por voz. Puedes escribir el nombre."
        );
        return;
    }

    if (vozProduccionActiva && reconocimientoProduccion) {
        detenerVozProduccion();
        return;
    }

    reconocimientoProduccion = new SpeechRecognition();
    reconocimientoProduccion.lang = "es-PE";
    reconocimientoProduccion.continuous = false;
    reconocimientoProduccion.interimResults = false;
    reconocimientoProduccion.maxAlternatives = 3;

    reconocimientoProduccion.onstart = function () {
        vozProduccionActiva = true;
        $id("botonMicrofonoProduccion")?.classList.add("escuchando");

        mensaje(
            "estadoVozProduccion",
            "Escuchando... di el nombre del cliente."
        );
    };

    reconocimientoProduccion.onresult = function (evento) {
        const resultado = evento.results[0];
        const transcripcion = resultado && resultado[0]
            ? resultado[0].transcript.trim()
            : "";

        if (transcripcion) {
            const campo = $id("buscarClienteProduccion");

            if (campo) campo.value = transcripcion;

            mostrarClientesProduccion();

            mensaje(
                "estadoVozProduccion",
                "Búsqueda por voz: " + transcripcion
            );
        } else {
            mensaje(
                "estadoVozProduccion",
                "No se reconoció el nombre. Inténtalo otra vez."
            );
        }
    };

    reconocimientoProduccion.onerror = function (evento) {
        console.warn(
            "Error de reconocimiento de voz en producción:",
            evento.error
        );

        mensaje(
            "estadoVozProduccion",
            evento.error === "not-allowed"
                ? "Permite el acceso al micrófono en el navegador."
                : evento.error === "no-speech"
                    ? "No se detectó voz. Inténtalo otra vez."
                    : "No se pudo usar el micrófono. Inténtalo otra vez."
        );
    };

    reconocimientoProduccion.onend = function () {
        vozProduccionActiva = false;
        $id("botonMicrofonoProduccion")?.classList.remove("escuchando");
    };

    try {
        reconocimientoProduccion.start();
    } catch (error) {
        console.error(
            "No se pudo iniciar el micrófono de producción:",
            error
        );

        mensaje(
            "estadoVozProduccion",
            "No se pudo iniciar el micrófono. Inténtalo otra vez."
        );

        detenerVozProduccion();
    }
}

function detenerVozProduccion() {
    if (reconocimientoProduccion) {
        try {
            reconocimientoProduccion.stop();
        } catch (error) {
            console.warn(
                "El reconocimiento de producción ya estaba detenido.",
                error
            );
        }
    }

    vozProduccionActiva = false;
    $id("botonMicrofonoProduccion")?.classList.remove("escuchando");
}

/* =========================================================
   ACTUALIZAR ENCABEZADO
========================================================= */

function actualizarEncabezado() {
    const nombre = localStorage.getItem(CLAVE_NOMBRE) || "CAMWEB";
    const logo = localStorage.getItem(CLAVE_LOGO);

    const nombreEmpresa = $id("nombreEmpresa");
    const logoEmpresa = $id("logoEmpresa");
    const logoInicial = $id("logoInicial");

    if (nombreEmpresa) nombreEmpresa.textContent = nombre;

    if (logoEmpresa && logoInicial) {
        if (logo) {
            logoEmpresa.src = logo;
            logoEmpresa.hidden = false;
            logoInicial.hidden = true;
        } else {
            logoEmpresa.removeAttribute("src");
            logoEmpresa.hidden = true;
            logoInicial.hidden = false;
        }
    }
}

/* =========================================================
   ACTUALIZAR DASHBOARD
========================================================= */

function fechaTableroISO(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function formatoLitrosTablero(valor) {
    return `${Number(valor || 0).toLocaleString("es-PE", { maximumFractionDigits: 2 })} L`;
}

function formatoSolesTablero(valor) {
    return `S/ ${Number(valor || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function periodoResumenTablero(agrupacion, fecha = new Date()) {
    const hasta = fechaTableroISO(fecha);
    let inicio;
    if (agrupacion === "quincena") {
        inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() <= 15 ? 1 : 16, 12);
    } else if (agrupacion === "mes") {
        inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1, 12);
    } else if (agrupacion === "anio") {
        inicio = new Date(fecha.getFullYear(), 0, 1, 12);
    } else {
        inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12);
    }
    return { desde: fechaTableroISO(inicio), hasta };
}

function sumarMapaPeriodoTablero(valoresPorFecha, periodo) {
    return Object.entries(valoresPorFecha || {}).reduce((total, [fecha, valor]) => {
        if (fecha < periodo.desde || fecha > periodo.hasta) return total;
        return total + (Number(valor) || 0);
    }, 0);
}

function rangoTablero() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    const agrupacion = $id("tableroAgrupacion")?.value || "dia";
    const hasta = fechaTableroISO(hoy);
    let desde = `${anio}-${String(mes).padStart(2, "0")}-01`;

    if (agrupacion === "anio") {
        desde = `${anio - 4}-01-01`;
    } else {
        let fechaMasAntigua = "";
        const registrarFecha = fecha => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha <= hasta && (!fechaMasAntigua || fecha < fechaMasAntigua)) {
                fechaMasAntigua = fecha;
            }
        };

        Object.values(leerProduccion()).forEach(periodos => {
            Object.values(periodos || {}).forEach(registro => {
                Object.keys(registro?.litros || {}).forEach(registrarFecha);
            });
        });
        Object.values(leerRegistrosDescarga()).forEach(registrosProveedor => {
            Object.keys(registrosProveedor || {}).forEach(registrarFecha);
        });
        Object.values(leerAdelantosFinanzas()).forEach(adelantos => {
            (adelantos || []).forEach(adelanto => {
                registrarFecha(fechaLocalISOFinanzasReporte(adelanto.fecha));
                const descuentos = Array.isArray(adelanto.registrosDescuento) && adelanto.registrosDescuento.length
                    ? adelanto.registrosDescuento
                    : (adelanto.quincenas || []).flatMap(cuota => Object.entries(cuota.descuentos || {}).map(([fecha, monto]) => ({ fecha, monto })));
                descuentos.forEach(registro => registrarFecha(fechaLocalISOFinanzasReporte(registro.fecha)));
            });
        });

        if (fechaMasAntigua) desde = fechaMasAntigua;
    }

    return { desde, hasta, anio, mes, agrupacion };
}

function clientesTableroDeCamion(idCamion) {
    const clientes = [
        ...leerClientesDeVehiculo(idCamion),
        ...leerClientesArchivadosReporte(idCamion)
    ];
    const unicos = new Map();
    clientes.forEach(cliente => {
        if (cliente && cliente.id !== undefined && cliente.nombre) unicos.set(String(cliente.id), cliente);
    });
    return [...unicos.values()];
}

function claveGrupoTablero(fecha, agrupacion) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    if (agrupacion === "dia") return { clave: fecha, etiqueta: `${dia}/${mes}/${String(anio).slice(-2)}` };
    if (agrupacion === "quincena") return { clave: `${anio}-${String(mes).padStart(2, "0")}-Q${dia <= 15 ? 1 : 2}`, etiqueta: `${dia <= 15 ? "1.ª" : "2.ª"} Q ${NOMBRES_MESES[mes - 1].slice(0, 3)} ${anio}` };
    if (agrupacion === "anio") return { clave: String(anio), etiqueta: String(anio) };
    return { clave: `${anio}-${String(mes).padStart(2, "0")}`, etiqueta: `${NOMBRES_MESES[mes - 1].slice(0, 3)} ${anio}` };
}

function crearKpiTablero(etiqueta, valor, detalle, icono, clase = "") {
    const tarjeta = document.createElement("article");
    tarjeta.className = `kpi-tablero ${clase}`.trim();
    const iconoElemento = document.createElement("span");
    iconoElemento.className = "icono-kpi-tablero";
    iconoElemento.textContent = icono;
    const cuerpo = document.createElement("div");
    const titulo = document.createElement("span");
    titulo.className = "etiqueta-kpi-tablero";
    titulo.textContent = etiqueta;
    const total = document.createElement("strong");
    total.className = "valor-kpi-tablero";
    total.textContent = valor;
    const nota = document.createElement("small");
    nota.textContent = detalle;
    cuerpo.append(titulo, total, nota);
    tarjeta.append(iconoElemento, cuerpo);
    return tarjeta;
}

function datosTablero() {
    const rango = rangoTablero();
    if (!rango) return null;
    const vehiculos = leerVehiculos();
    const registrosProduccion = leerProduccion();
    const registrosDescarga = leerRegistrosDescarga();
    const idCamionSeleccionado = $id("tableroCamion")?.value || "todos";
    const camionesFiltrados = idCamionSeleccionado === "todos"
        ? vehiculos
        : vehiculos.filter(camion => String(camion.id) === idCamionSeleccionado);
    const camiones = new Map(camionesFiltrados.map(camion => [String(camion.id), {
        camion, recogido: 0, descargado: 0, valorProduccion: 0, clientes: new Set()
    }]));
    const reportesClientes = new Map();
    camiones.forEach((acumulado, idCamion) => {
        clientesTableroDeCamion(idCamion).forEach(cliente => {
            const fechaAlta = fechaLocalISOFinanzasReporte(cliente.fechaRegistro);
            const fechaRetiro = fechaLocalISOFinanzasReporte(cliente.fechaRetiro);
            if ((!fechaAlta || fechaAlta <= rango.hasta) && (!fechaRetiro || fechaRetiro >= rango.desde)) {
                acumulado.clientes.add(String(cliente.id));
                const clave = `${idCamion}::${cliente.id}`;
                reportesClientes.set(clave, {
                    clave, cliente, camion: acumulado.camion,
                    totalLitros: 0, valorProduccion: 0, litrosPorFecha: {},
                    totalDescuentos: 0, descuentosPorFecha: {}, cantidadDescuentosPorFecha: {},
                    cantidadDescuentos: 0, totalAdelantos: 0, adelantosPorFecha: {}, cantidadAdelantosPorFecha: {},
                    cantidadAdelantos: 0, incluidoPorRango: true
                });
            }
        });
    });
    const dias = new Map();
    let recogidoSinCamion = 0;
    let descargadoSinCamion = 0;

    const registrarDia = (fecha) => {
        if (!dias.has(fecha)) dias.set(fecha, { recogido: 0, descargado: 0 });
        return dias.get(fecha);
    };

    Object.entries(registrosProduccion).forEach(([claveCliente, periodos]) => {
        const separador = claveCliente.indexOf("::");
        if (separador < 0) return;
        const idCamion = claveCliente.slice(0, separador);
        const idCliente = claveCliente.slice(separador + 2);
        const acumuladoCamion = camiones.get(idCamion);
        if (!acumuladoCamion) return;
        const claveDetalleCliente = `${idCamion}::${idCliente}`;
        let detalleCliente = reportesClientes.get(claveDetalleCliente);
        if (!detalleCliente) {
            const cliente = clientesTableroDeCamion(idCamion).find(item => String(item.id) === idCliente) || {
                id: idCliente, nombre: `Cliente ${idCliente}`, precio: 0
            };
            detalleCliente = { clave: claveDetalleCliente, cliente, camion: acumuladoCamion.camion, totalLitros: 0, valorProduccion: 0, litrosPorFecha: {}, totalDescuentos: 0, descuentosPorFecha: {}, cantidadDescuentosPorFecha: {}, cantidadDescuentos: 0, totalAdelantos: 0, adelantosPorFecha: {}, cantidadAdelantosPorFecha: {}, cantidadAdelantos: 0, incluidoPorRango: false };
            reportesClientes.set(claveDetalleCliente, detalleCliente);
        }
        const fechaAlta = fechaLocalISOFinanzasReporte(detalleCliente.cliente?.fechaRegistro);
        const fechaRetiro = fechaLocalISOFinanzasReporte(detalleCliente.cliente?.fechaRetiro);
        Object.values(periodos || {}).forEach(registro => {
            const litros = registro?.litros;
            if (!litros || typeof litros !== "object") return;
            Object.entries(litros).forEach(([fecha, valor]) => {
                if (fecha < rango.desde || fecha > rango.hasta) return;
                if ((fechaAlta && fecha < fechaAlta) || (fechaRetiro && fecha > fechaRetiro)) return;
                const cantidad = Number(valor);
                if (!Number.isFinite(cantidad) || cantidad < 0) return;
                acumuladoCamion.recogido += cantidad;
                const valorProduccion = cantidad * (Number(detalleCliente.cliente?.precio) || 0);
                acumuladoCamion.valorProduccion += valorProduccion;
                detalleCliente.totalLitros += cantidad;
                detalleCliente.valorProduccion += valorProduccion;
                detalleCliente.litrosPorFecha[fecha] = (detalleCliente.litrosPorFecha[fecha] || 0) + cantidad;
                acumuladoCamion.clientes.add(idCliente);
                registrarDia(fecha).recogido += cantidad;
            });
        });
    });

    Object.entries(leerAdelantosFinanzas()).forEach(([claveCliente, adelantos]) => {
        const separador = claveCliente.indexOf("::");
        if (separador < 0) return;
        const idCamion = claveCliente.slice(0, separador);
        const idCliente = claveCliente.slice(separador + 2);
        const acumuladoCamion = camiones.get(idCamion);
        if (!acumuladoCamion) return;

        let detalleCliente = reportesClientes.get(claveCliente);
        if (!detalleCliente) {
            const cliente = clientesTableroDeCamion(idCamion).find(item => String(item.id) === idCliente) || {
                id: idCliente, nombre: `Cliente ${idCliente}`, precio: 0
            };
            detalleCliente = {
                clave: claveCliente, cliente, camion: acumuladoCamion.camion,
                totalLitros: 0, valorProduccion: 0, litrosPorFecha: {},
                totalDescuentos: 0, descuentosPorFecha: {}, cantidadDescuentosPorFecha: {}, cantidadDescuentos: 0,
                totalAdelantos: 0, adelantosPorFecha: {}, cantidadAdelantosPorFecha: {}, cantidadAdelantos: 0, incluidoPorRango: false
            };
            reportesClientes.set(claveCliente, detalleCliente);
        }

        (adelantos || []).forEach(adelanto => {
            const fechaAdelanto = fechaLocalISOFinanzasReporte(adelanto.fecha);
            const montoAdelanto = Number(adelanto.monto) || 0;
            if (fechaAdelanto && fechaAdelanto >= rango.desde && fechaAdelanto <= rango.hasta && montoAdelanto > 0) {
                detalleCliente.totalAdelantos += montoAdelanto;
                detalleCliente.cantidadAdelantos += 1;
                detalleCliente.adelantosPorFecha[fechaAdelanto] = (detalleCliente.adelantosPorFecha[fechaAdelanto] || 0) + montoAdelanto;
                detalleCliente.cantidadAdelantosPorFecha[fechaAdelanto] = (detalleCliente.cantidadAdelantosPorFecha[fechaAdelanto] || 0) + 1;
            }

            let descuentos = Array.isArray(adelanto.registrosDescuento) ? adelanto.registrosDescuento : [];
            if (!descuentos.length) {
                descuentos = (adelanto.quincenas || []).flatMap(cuota => {
                    const fechasCuota = Object.entries(cuota.descuentos || {}).map(([fecha, monto]) => ({ fecha, monto }));
                    if (fechasCuota.length) return fechasCuota;
                    return cuota.fecha && Number(cuota.descuento) > 0
                        ? [{ fecha: cuota.fecha, monto: cuota.descuento }]
                        : [];
                });
            }
            descuentos.forEach(registro => {
                const fechaDescuento = fechaLocalISOFinanzasReporte(registro.fecha);
                const montoDescuento = Number(registro.monto) || 0;
                if (!fechaDescuento || fechaDescuento < rango.desde || fechaDescuento > rango.hasta || montoDescuento <= 0) return;
                detalleCliente.totalDescuentos += montoDescuento;
                detalleCliente.cantidadDescuentos += 1;
                detalleCliente.descuentosPorFecha[fechaDescuento] = (detalleCliente.descuentosPorFecha[fechaDescuento] || 0) + montoDescuento;
                detalleCliente.cantidadDescuentosPorFecha[fechaDescuento] = (detalleCliente.cantidadDescuentosPorFecha[fechaDescuento] || 0) + 1;
            });
        });
    });

    Object.values(registrosDescarga).forEach(datosProveedor => {
        Object.entries(datosProveedor || {}).forEach(([fecha, valor]) => {
            if (fecha < rango.desde || fecha > rango.hasta) return;
            if (valor && typeof valor === "object") {
                Object.entries(valor).forEach(([idCamion, litros]) => {
                    if (idCamion === "__total") return;
                    const cantidad = Number(litros);
                    if (!Number.isFinite(cantidad) || cantidad < 0) return;
                    const acumuladoCamion = camiones.get(String(idCamion));
                    if (acumuladoCamion) {
                        acumuladoCamion.descargado += cantidad;
                        registrarDia(fecha).descargado += cantidad;
                    } else if (idCamionSeleccionado === "todos") {
                        descargadoSinCamion += cantidad;
                        registrarDia(fecha).descargado += cantidad;
                    }
                });
            } else {
                const cantidad = Number(valor);
                if (Number.isFinite(cantidad) && cantidad >= 0 && idCamionSeleccionado === "todos") {
                    descargadoSinCamion += cantidad;
                    registrarDia(fecha).descargado += cantidad;
                }
            }
        });
    });

    const tarjetas = [...camiones.values()];
    const clientes = [...reportesClientes.values()].filter(item => item.incluidoPorRango || item.totalLitros > 0 || item.totalDescuentos > 0 || item.totalAdelantos > 0).sort((a, b) =>
        String(a.cliente.nombre).localeCompare(String(b.cliente.nombre), "es")
    );
    const totalRecogido = tarjetas.reduce((suma, dato) => suma + dato.recogido, 0);
    const totalDescargado = tarjetas.reduce((suma, dato) => suma + dato.descargado, 0) + descargadoSinCamion;
    const totalValor = tarjetas.reduce((suma, dato) => suma + dato.valorProduccion, 0);
    const totalClientes = new Set(tarjetas.flatMap(dato => [...dato.clientes].map(id => `${dato.camion.id}::${id}`))).size;
    const agrupacion = $id("tableroAgrupacion")?.value || "dia";
    const grupos = new Map();
    const tendenciaDiaria = [];
    const cursor = new Date(`${rango.desde}T12:00:00`);
    while (fechaTableroISO(cursor) <= rango.hasta) {
        const fecha = fechaTableroISO(cursor);
        const valores = dias.get(fecha) || { recogido: 0, descargado: 0 };
        tendenciaDiaria.push({ ...claveGrupoTablero(fecha, "dia"), recogido: valores.recogido, descargado: valores.descargado });
        const grupo = claveGrupoTablero(fecha, agrupacion);
        if (!grupos.has(grupo.clave)) grupos.set(grupo.clave, { ...grupo, recogido: 0, descargado: 0 });
        const datos = grupos.get(grupo.clave);
        datos.recogido += valores.recogido;
        datos.descargado += valores.descargado;
        cursor.setDate(cursor.getDate() + 1);
    }
    const tendencia = [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
    const valoresHoy = dias.get(rango.hasta) || { recogido: 0, descargado: 0 };
    return {
        rango, vehiculos: camionesFiltrados, tarjetas, clientes, totalRecogido, totalDescargado,
        totalValor, totalClientes, recogidoSinCamion, descargadoSinCamion, tendencia, tendenciaDiaria,
        litrosRecogidosHoy: valoresHoy.recogido, litrosDescargadosHoy: valoresHoy.descargado
    };
}

function construirSeriesProduccionTablero(clientes, grupos, vehiculos, idCamion, idCliente, agrupacion) {
    const colores = ["#31844d", "#408fc2", "#df8c35", "#8957a3", "#d45555", "#3f9c91", "#b34f8c", "#758b35", "#5264ad", "#b27638"];
    const indicesPeriodo = new Map(grupos.map((grupo, indice) => [grupo.clave, indice]));
    const esTodosCamiones = idCamion === "todos";
    const series = esTodosCamiones
        ? vehiculos.map((camion, indice) => ({
            clave: String(camion.id),
            nombre: `Camión ${indice + 1}${camion.placa ? ` · ${camion.placa}` : ""}`,
            color: colores[indice % colores.length],
            valores: Array(grupos.length).fill(0)
        }))
        : clientes
            .filter(item => String(item.camion.id) === String(idCamion) && (idCliente === "todos" || item.clave === idCliente))
            .map((item, indice) => ({
                clave: item.clave,
                nombre: item.cliente.nombre || "Cliente",
                color: colores[indice % colores.length],
                valores: Array(grupos.length).fill(0)
            }));
    const seriesPorClave = new Map(series.map(serie => [serie.clave, serie]));

    clientes.forEach(item => {
        const claveSerie = esTodosCamiones ? String(item.camion.id) : item.clave;
        const serie = seriesPorClave.get(claveSerie);
        if (!serie) return;
        Object.entries(item.litrosPorFecha || {}).forEach(([fecha, litros]) => {
            const clavePeriodo = claveGrupoTablero(fecha, agrupacion).clave;
            const indicePeriodo = indicesPeriodo.get(clavePeriodo);
            if (indicePeriodo !== undefined) serie.valores[indicePeriodo] += Number(litros) || 0;
        });
    });

    return series;
}

function construirSeriesReporteTablero(datos, tipo, vehiculos, idCamion, idCliente) {
    const colores = ["#31844d", "#408fc2", "#df8c35", "#8957a3", "#d45555", "#3f9c91", "#b34f8c", "#758b35", "#5264ad", "#b27638"];
    const grupos = tipo === "perdidas" ? datos.tendenciaDiaria : datos.tendencia;
    const agrupacion = datos.rango.agrupacion;
    const indicesPeriodo = new Map(grupos.map((grupo, indice) => [grupo.clave, indice]));
    const todosCamiones = idCamion === "todos";
    const crearSerie = (clave, nombre, color) => ({ clave, nombre, color, valores: Array(grupos.length).fill(0) });
    const sumarFechas = (serie, valoresPorFecha, factor = 1) => {
        Object.entries(valoresPorFecha || {}).forEach(([fecha, valor]) => {
            const indice = indicesPeriodo.get(claveGrupoTablero(fecha, agrupacion).clave);
            if (indice !== undefined) serie.valores[indice] += (Number(valor) || 0) * factor;
        });
    };
    const clientes = tipo === "ganancias"
        ? datos.clientes
        : datos.clientes.filter(item => idCliente === "todos" || item.clave === idCliente);

    if (tipo === "ganancias") {
        const proveedores = leerProveedoresDescarga();
        const proveedoresObjetivo = idCliente === "todos"
            ? proveedores
            : proveedores.filter(proveedor => String(proveedor.id) === String(idCliente));
        const series = proveedoresObjetivo.map((proveedor, indice) =>
            crearSerie(`proveedor-${proveedor.id}`, proveedor.nombre || "Proveedor", colores[indice % colores.length])
        );
        const seriesPorProveedor = new Map(proveedoresObjetivo.map((proveedor, indice) => [
            String(proveedor.id),
            { serie: series[indice], precio: Number(proveedor.precio) || 0 }
        ]));
        const registros = leerRegistrosDescarga();

        Object.entries(registros).forEach(([idProveedor, datosProveedor]) => {
            const proveedor = seriesPorProveedor.get(String(idProveedor));
            if (!proveedor) return;
            Object.entries(datosProveedor || {}).forEach(([fecha, valor]) => {
                if (fecha < datos.rango.desde || fecha > datos.rango.hasta) return;
                let litrosFecha = 0;
                if (valor && typeof valor === "object") {
                    Object.entries(valor).forEach(([idRegistro, litros]) => {
                        if (idRegistro === "__total") return;
                        if (idRegistro === "__sinCamion") {
                            if (todosCamiones) litrosFecha += Number(litros) || 0;
                            return;
                        }
                        if (todosCamiones || String(idRegistro) === String(idCamion)) {
                            litrosFecha += Number(litros) || 0;
                        }
                    });
                } else if (todosCamiones) {
                    litrosFecha = Number(valor) || 0;
                }
                sumarFechas(proveedor.serie, { [fecha]: litrosFecha }, proveedor.precio);
            });
        });
        return series;
    }
    if (tipo === "perdidas") {
        const perdida = crearSerie("perdida-total", "Pérdida", colores[0]);
        grupos.forEach((grupo, indice) => {
            perdida.valores[indice] = Math.max(0, (Number(grupo.recogido) || 0) - (Number(grupo.descargado) || 0));
        });
        return [perdida];
    }
    const mapaPorTipo = {
        produccion: { campo: "litrosPorFecha", unidad: "Producción" },
        descuentos: { campo: "descuentosPorFecha", unidad: "Descuentos" },
        adelantos: { campo: "adelantosPorFecha", unidad: "Adelantos" }
    };
    const configuracion = mapaPorTipo[tipo] || mapaPorTipo.produccion;
    const series = [];
    if (todosCamiones && ["produccion", "descuentos", "adelantos"].includes(tipo)) {
        clientes.forEach((item, indice) => {
            const numeroCamion = vehiculos.findIndex(camion => String(camion.id) === String(item.camion.id)) + 1;
            const nombre = `${item.cliente.nombre || "Cliente"} · Cami\u00f3n ${numeroCamion}`;
            const serie = crearSerie(item.clave, nombre, colores[indice % colores.length]);
            sumarFechas(serie, item[configuracion.campo]);
            series.push(serie);
        });
    } else if (todosCamiones) {
        vehiculos.forEach((camion, indice) => {
            const numeroCamion = vehiculos.findIndex(item => String(item.id) === String(camion.id)) + 1;
            series.push(crearSerie(String(camion.id), `Camión ${numeroCamion}${camion.placa ? ` · ${camion.placa}` : ""}`, colores[indice % colores.length]));
        });
        const porCamion = new Map(series.map(serie => [serie.clave, serie]));
        clientes.forEach(item => {
            const serie = porCamion.get(String(item.camion.id));
            if (serie) sumarFechas(serie, item[configuracion.campo]);
        });
    } else {
        clientes.filter(item => String(item.camion.id) === String(idCamion)).forEach((item, indice) => {
            const serie = crearSerie(item.clave, item.cliente.nombre || "Cliente", colores[indice % colores.length]);
            sumarFechas(serie, item[configuracion.campo]);
            series.push(serie);
        });
    }
    return series;
}

function calcularGananciasTablero(datos, vehiculos, idCamion, idProveedor, periodo = datos.rango) {
    const clientes = datos.clientes;
    const totalLitrosComprados = clientes.reduce((total, item) => total + sumarMapaPeriodoTablero(item.litrosPorFecha, periodo), 0);
    const ingresosClientes = clientes.reduce((total, item) =>
        total + sumarMapaPeriodoTablero(item.litrosPorFecha, periodo) * (Number(item.cliente.precio) || 0), 0);
    const preciosProveedores = new Map(leerProveedoresDescarga().map(proveedor => [String(proveedor.id), Number(proveedor.precio) || 0]));
    const registros = leerRegistrosDescarga();
    let costoProveedores = 0;
    let totalLitrosVendidos = 0;
    Object.entries(registros).forEach(([idProveedorRegistro, datosProveedor]) => {
        if (idProveedor !== "todos" && String(idProveedorRegistro) !== String(idProveedor)) return;
        const precio = preciosProveedores.get(String(idProveedorRegistro)) || 0;
        Object.entries(datosProveedor || {}).forEach(([fecha, valor]) => {
            if (fecha < periodo.desde || fecha > periodo.hasta) return;
            if (valor && typeof valor === "object") {
                Object.entries(valor).forEach(([id, litros]) => {
                    if (id === "__total") return;
                    if (id === "__sinCamion") {
                        if (idCamion === "todos") {
                            totalLitrosVendidos += Number(litros) || 0;
                            costoProveedores += (Number(litros) || 0) * precio;
                        }
                        return;
                    }
                    if (idCamion !== "todos" && String(id) !== String(idCamion)) return;
                    totalLitrosVendidos += Number(litros) || 0;
                    costoProveedores += (Number(litros) || 0) * precio;
                });
            } else if (idCamion === "todos") {
                totalLitrosVendidos += Number(valor) || 0;
                costoProveedores += (Number(valor) || 0) * precio;
            }
        });
    });
    const precioVentaPromedio = totalLitrosVendidos > 0 ? costoProveedores / totalLitrosVendidos : 0;
    const ganancia = ingresosClientes - costoProveedores;
    const gananciaPorLitro = totalLitrosVendidos > 0 ? ganancia / totalLitrosVendidos : 0;
    return {
        totalLitrosComprados,
        totalLitrosVendidos,
        totalComprado: ingresosClientes,
        ingresosClientes,
        costoProveedores,
        precioVentaPromedio,
        gananciaPorLitro,
        ganancia
    };
}

function dibujarTendenciaTablero(contenedor, grupos, series = [], unidad = "L") {
    contenedor.replaceChildren();
    if (!grupos.length || !series.length) {
        contenedor.textContent = "No hay producción para comparar en este periodo.";
        contenedor.classList.add("grafico-vacio-tablero");
        return;
    }
    contenedor.classList.remove("grafico-vacio-tablero");
    contenedor.classList.add("grafico-lineas-tablero");

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 900 260");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Producción por camión o cliente a través del tiempo");

    const ancho = 900;
    const alto = 260;
    const margen = { arriba: 12, derecha: 14, abajo: 34, izquierda: 48 };
    const anchoGrafico = ancho - margen.izquierda - margen.derecha;
    const altoGrafico = alto - margen.arriba - margen.abajo;
    const maximoDatos = Math.max(0, ...series.flatMap(serie => serie.valores));
    const maximo = maximoDatos > 0 ? maximoDatos : 1;
    const pasoVertical = maximo / 4;
    const x = indice => margen.izquierda + (grupos.length < 2 ? anchoGrafico / 2 : indice * anchoGrafico / (grupos.length - 1));
    const y = valor => margen.arriba + altoGrafico - (valor / maximo) * altoGrafico;
    const crearSVG = (nombre, atributos = {}) => {
        const elemento = document.createElementNS(svgNS, nombre);
        Object.entries(atributos).forEach(([clave, valor]) => elemento.setAttribute(clave, String(valor)));
        return elemento;
    };

    for (let indice = 0; indice <= 4; indice++) {
        const valor = pasoVertical * indice;
        const posicionY = y(valor);
        svg.appendChild(crearSVG("line", { x1: margen.izquierda, y1: posicionY, x2: ancho - margen.derecha, y2: posicionY, class: "linea-guia-tablero" }));
        const etiquetaY = crearSVG("text", { x: margen.izquierda - 8, y: posicionY + 3, "text-anchor": "end", class: "etiqueta-eje-tablero" });
        etiquetaY.textContent = `${unidad === "S/" ? "S/ " : ""}${Math.round(valor).toLocaleString("es-PE")}${unidad === "L" ? " L" : ""}`;
        svg.appendChild(etiquetaY);
    }

    const cadaEtiqueta = Math.max(1, Math.ceil(grupos.length / 10));
    grupos.forEach((grupo, indice) => {
        if (indice % cadaEtiqueta !== 0 && indice !== grupos.length - 1) return;
        const etiquetaX = crearSVG("text", { x: x(indice), y: alto - 9, "text-anchor": "middle", class: "etiqueta-eje-tablero" });
        etiquetaX.textContent = grupo.etiqueta;
        svg.appendChild(etiquetaX);
    });

    series.forEach(serie => {
        const puntos = serie.valores.map((valor, indice) => `${x(indice)},${y(Number(valor) || 0)}`).join(" ");
        svg.appendChild(crearSVG("polyline", { points: puntos, class: "trazo-serie-cliente-tablero", stroke: serie.color }));
        grupos.forEach((grupo, indice) => {
            const valor = Number(serie.valores[indice]) || 0;
            const punto = crearSVG("circle", { cx: x(indice), cy: y(valor), r: 3, class: "punto-serie-cliente-tablero", fill: serie.color });
            const titulo = crearSVG("title");
            titulo.textContent = `${serie.nombre} · ${grupo.etiqueta}: ${unidad === "S/" ? formatoSolesTablero(valor) : formatoLitrosTablero(valor)}`;
            punto.appendChild(titulo);
            svg.appendChild(punto);
        });
    });

    contenedor.appendChild(svg);
}

function gruposProduccionClienteTablero(cliente, rango, agrupacion) {
    const grupos = new Map();
    const cursor = new Date(`${rango.desde}T12:00:00`);
    while (fechaTableroISO(cursor) <= rango.hasta) {
        const fecha = fechaTableroISO(cursor);
        const grupo = claveGrupoTablero(fecha, agrupacion);
        if (!grupos.has(grupo.clave)) grupos.set(grupo.clave, { ...grupo, recogido: 0, descargado: 0 });
        grupos.get(grupo.clave).recogido += Number(cliente.litrosPorFecha[fecha]) || 0;
        cursor.setDate(cursor.getDate() + 1);
    }
    return [...grupos.values()];
}

function renderizarDetalleClienteTablero(datos, clave) {
    const panel = $id("detalleClienteTablero");
    const cliente = datos.clientes.find(item => item.clave === clave);
    if (!panel || !cliente) {
        if (panel) panel.hidden = true;
        return;
    }
    panel.hidden = false;
    const camiones = leerVehiculos();
    const numeroCamion = camiones.findIndex(item => String(item.id) === String(cliente.camion.id)) + 1;
    $id("nombreDetalleClienteTablero").textContent = cliente.cliente.nombre || "Cliente";
    $id("datosDetalleClienteTablero").textContent = `Camión ${numeroCamion} · ${cliente.camion.placa || "Sin placa"} · S/ ${formatearPrecio(cliente.cliente.precio)} por litro · ${datos.rango.desde} a ${datos.rango.hasta}`;
    $id("kpisDetalleClienteTablero").replaceChildren(
        crearKpiTablero("Litros recogidos", formatoLitrosTablero(cliente.totalLitros), "En el rango seleccionado", "🥛", "verde"),
        crearKpiTablero("Precio por litro", formatoSolesTablero(cliente.cliente.precio), "Precio registrado actualmente", "S/", "azul"),
        crearKpiTablero("Producción estimada", formatoSolesTablero(cliente.valorProduccion), "Litros × precio actual", "Σ", "ambar")
    );
    const agrupacion = $id("tableroAgrupacion")?.value || "dia";
    dibujarTendenciaTablero(
        $id("graficoClienteTablero"),
        gruposProduccionClienteTablero(cliente, datos.rango, agrupacion)
    );
    const filas = $id("filasDiariasClienteTablero");
    filas.replaceChildren();
    Object.entries(cliente.litrosPorFecha).sort(([a], [b]) => a.localeCompare(b)).forEach(([fecha, litros]) => {
        const fila = document.createElement("tr");
        const fechaLocal = new Date(`${fecha}T12:00:00`);
        const nombreDia = new Intl.DateTimeFormat("es-PE", { weekday: "long" }).format(fechaLocal);
        [fecha, nombreDia, formatoLitrosTablero(litros), formatoSolesTablero(litros * (Number(cliente.cliente.precio) || 0))].forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });
        filas.appendChild(fila);
    });
    if (!Object.keys(cliente.litrosPorFecha).length) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = 4;
        celda.textContent = "Este cliente no tiene producción registrada en el rango elegido.";
        fila.appendChild(celda);
        filas.appendChild(fila);
    }
}

function actualizarDashboard() {
    const selectorCamion = $id("tableroCamion");
    if (!selectorCamion) return;
    const seleccionPrevia = selectorCamion.value || "todos";
    const selectorCliente = $id("tableroCliente");
    const tipoReporte = $id("tableroTipoReporte")?.value || "produccion";
    const clientePrevio = selectorCliente?.dataset.tipoReporte === tipoReporte
        ? selectorCliente.value || "todos"
        : "todos";
    const etiquetaFiltro = $id("etiquetaFiltroClienteTablero");
    if (selectorCliente?.closest("label")) selectorCliente.closest("label").hidden = tipoReporte === "perdidas";
    const lista = leerVehiculos();
    selectorCamion.replaceChildren(new Option("Todos los camiones", "todos"));
    lista.forEach((camion, indice) => selectorCamion.add(new Option(`Camión ${indice + 1} · ${camion.placa || "Sin placa"}`, String(camion.id))));
    selectorCamion.value = [...selectorCamion.options].some(opcion => opcion.value === seleccionPrevia) ? seleccionPrevia : "todos";

    const datos = datosTablero();
    const estado = $id("estadoTablero");
    if (!datos) {
        const esGanancias = tipoReporte === "ganancias";
        if (etiquetaFiltro) etiquetaFiltro.textContent = esGanancias ? "Proveedores" : "Clientes";
        selectorCliente?.replaceChildren(new Option(esGanancias ? "Todos los proveedores" : "Todos los clientes", "todos"));
        if (estado) estado.textContent = "No hay datos para mostrar en este periodo.";
        if ($id("detalleClienteTablero")) $id("detalleClienteTablero").hidden = true;
        return;
    }
    if (selectorCliente) {
        const esGanancias = tipoReporte === "ganancias";
        if (etiquetaFiltro) etiquetaFiltro.textContent = esGanancias ? "Proveedores" : "Clientes";
        selectorCliente.replaceChildren(new Option(esGanancias ? "Todos los proveedores" : "Todos los clientes", "todos"));
        if (esGanancias) {
            leerProveedoresDescarga().forEach(proveedor => selectorCliente.add(new Option(proveedor.nombre, String(proveedor.id))));
        } else {
        datos.clientes.forEach(item => {
            const numeroCamion = lista.findIndex(camion => String(camion.id) === String(item.camion.id)) + 1;
            selectorCliente.add(new Option(`${item.cliente.nombre} · Camión ${numeroCamion}`, item.clave));
        });
        }
        selectorCliente.value = [...selectorCliente.options].some(opcion => opcion.value === clientePrevio) ? clientePrevio : "todos";
        selectorCliente.dataset.tipoReporte = tipoReporte;
    }
    clienteTableroSeleccionado = tipoReporte !== "ganancias" && selectorCliente?.value && selectorCliente.value !== "todos"
        ? selectorCliente.value
        : null;
    if (estado) estado.textContent = `${datos.rango.desde} — ${datos.rango.hasta}`;
    const diferencia = datos.totalRecogido - datos.totalDescargado;
    const precioPromedio = datos.totalRecogido > 0 ? datos.totalValor / datos.totalRecogido : 0;
    const kpis = $id("kpisTablero");
    kpis.replaceChildren(
        crearKpiTablero("Camiones", String(datos.vehiculos.length), "En el filtro actual", "🚚", "verde"),
        crearKpiTablero("Clientes", datos.totalClientes.toLocaleString("es-PE"), "Activos durante el rango", "👥", "azul"),
        crearKpiTablero("Recogido", formatoLitrosTablero(datos.totalRecogido), "Producción de clientes", "🥛", "verde"),
        crearKpiTablero("Descargado", formatoLitrosTablero(datos.totalDescargado), "Registro de descargas", "📦", "azul"),
        crearKpiTablero("Diferencia", formatoLitrosTablero(diferencia), formatoSolesTablero(diferencia * precioPromedio) + " estimado", "↕", diferencia >= 0 ? "ambar" : "rojo")
    );

    datos.tendenciaClientes = construirSeriesReporteTablero(
        datos,
        tipoReporte,
        lista,
        selectorCamion.value,
        selectorCliente?.value || "todos"
    );
    const clientesFiltrados = datos.clientes.filter(item => !clienteTableroSeleccionado || item.clave === clienteTableroSeleccionado);
    const agrupacionResumen = $id("tableroAgrupacion")?.value || "dia";
    const periodoKpi = periodoResumenTablero(agrupacionResumen);
    const diasPeriodoKpi = datos.tendenciaDiaria.filter(dia => dia.clave >= periodoKpi.desde && dia.clave <= periodoKpi.hasta);
    const litrosRecogidosPeriodo = diasPeriodoKpi.reduce((total, dia) => total + dia.recogido, 0);
    const litrosDescargadosPeriodo = diasPeriodoKpi.reduce((total, dia) => total + dia.descargado, 0);
    const detallePeriodoKpi = {
        dia: "Hoy",
        quincena: "Quincena actual",
        mes: "Mes actual",
        anio: "Año actual"
    }[agrupacionResumen] || "Hoy";
    const clientesKpi = clientesFiltrados.length;
    const litrosComprados = clientesFiltrados.reduce((total, item) => total + sumarMapaPeriodoTablero(item.litrosPorFecha, periodoKpi), 0);
    const litrosVendidos = litrosDescargadosPeriodo;
    const totalDescuentos = clientesFiltrados.reduce((total, item) => total + sumarMapaPeriodoTablero(item.descuentosPorFecha, periodoKpi), 0);
    const totalAdelantos = clientesFiltrados.reduce((total, item) => total + sumarMapaPeriodoTablero(item.adelantosPorFecha, periodoKpi), 0);
    const cantidadDescuentos = clientesFiltrados.reduce((total, item) => total + sumarMapaPeriodoTablero(item.cantidadDescuentosPorFecha, periodoKpi), 0);
    const cantidadAdelantos = clientesFiltrados.reduce((total, item) => total + sumarMapaPeriodoTablero(item.cantidadAdelantosPorFecha, periodoKpi), 0);
    const ganancias = calcularGananciasTablero(datos, lista, selectorCamion.value, selectorCliente?.value || "todos", periodoKpi);
    const totalCamionesKpi = clienteTableroSeleccionado
        ? new Set(clientesFiltrados.map(item => String(item.camion.id))).size
        : datos.vehiculos.length;
    const kpisReporte = $id("kpisTablero");
    if (tipoReporte === "descuentos") {
        kpisReporte.replaceChildren(
            crearKpiTablero("Camiones", String(totalCamionesKpi), "En el filtro actual", "🚚", "verde"),
            crearKpiTablero("Clientes", String(clientesKpi), detallePeriodoKpi, "👥", "azul"),
            crearKpiTablero("Descuentos", formatoSolesTablero(totalDescuentos), detallePeriodoKpi, "S/", "verde"),
            crearKpiTablero("Registros", String(cantidadDescuentos), detallePeriodoKpi, "#", "azul")
        );
    } else if (tipoReporte === "adelantos") {
        kpisReporte.replaceChildren(
            crearKpiTablero("Camiones", String(totalCamionesKpi), "En el filtro actual", "🚚", "verde"),
            crearKpiTablero("Clientes", String(clientesKpi), detallePeriodoKpi, "👥", "azul"),
            crearKpiTablero("Adelantos", formatoSolesTablero(totalAdelantos), detallePeriodoKpi, "S/", "verde"),
            crearKpiTablero("Registros", String(cantidadAdelantos), detallePeriodoKpi, "#", "azul")
        );
    } else if (tipoReporte === "ganancias") {
        kpisReporte.replaceChildren(
            crearKpiTablero("Total comprado", formatoLitrosTablero(ganancias.totalLitrosComprados), detallePeriodoKpi, "L", "azul"),
            crearKpiTablero("Total vendido", formatoLitrosTablero(ganancias.totalLitrosVendidos), detallePeriodoKpi, "L", "verde"),
            crearKpiTablero("Venta por litro", formatoSolesTablero(ganancias.precioVentaPromedio), "Precio cobrado a proveedores", "S/", "verde"),
            crearKpiTablero("Ganancia estimada", formatoSolesTablero(ganancias.ganancia), detallePeriodoKpi, "∆", ganancias.ganancia >= 0 ? "ambar" : "rojo")
        );
    } else if (tipoReporte === "perdidas") {
        const perdidaLitros = Math.max(0, litrosRecogidosPeriodo - litrosDescargadosPeriodo);
        kpisReporte.replaceChildren(
            crearKpiTablero("Camiones", String(totalCamionesKpi), "En el filtro actual", "🚚", "verde"),
            crearKpiTablero("Litros comprados", formatoLitrosTablero(litrosRecogidosPeriodo), detallePeriodoKpi, "L", "azul"),
            crearKpiTablero("Litros descargados", formatoLitrosTablero(litrosDescargadosPeriodo), detallePeriodoKpi, "L", "verde"),
            crearKpiTablero("Pérdida", formatoLitrosTablero(perdidaLitros), detallePeriodoKpi, "↘", perdidaLitros > 0 ? "rojo" : "ambar")
        );
    } else {
        const diferencia = litrosComprados - litrosVendidos;
        kpisReporte.replaceChildren(
            crearKpiTablero("Camiones", String(totalCamionesKpi), "En el filtro actual", "🚚", "verde"),
            crearKpiTablero("Clientes", String(clientesKpi), detallePeriodoKpi, "👥", "azul"),
            crearKpiTablero("Litros comprados", formatoLitrosTablero(litrosComprados), detallePeriodoKpi, "🥛", "verde"),
            crearKpiTablero("Litros vendidos", formatoLitrosTablero(litrosVendidos), detallePeriodoKpi, "📦", "azul"),
            crearKpiTablero("Diferencia", formatoLitrosTablero(diferencia), "Comprado menos vendido", "↕", diferencia >= 0 ? "ambar" : "rojo")
        );
    }
    const tituloReporte = $id("seccionDashboard")?.querySelector(".encabezado-tablero h2");
    const descripcionReporte = $id("seccionDashboard")?.querySelector(".encabezado-tablero p");
    const encabezadosReporte = {
        produccion: ["Reporte de producción", "Litros comprados a los clientes por periodo y camión."],
        descuentos: ["Reporte de descuentos", "Montos descontados a los clientes en el periodo elegido."],
        adelantos: ["Reporte de adelantos", "Montos entregados a los clientes en el periodo elegido."],
        ganancias: ["Reporte de ganancias", "Ingresos registrados en Recibos menos el costo de las descargas a proveedores."],
        perdidas: ["Reporte de pérdida", "Litros recogidos a clientes que no se descargaron a proveedores."]
    }[tipoReporte];
    if (tituloReporte && encabezadosReporte) tituloReporte.textContent = encabezadosReporte[0];
    if (descripcionReporte && encabezadosReporte) descripcionReporte.textContent = encabezadosReporte[1];
    if (tipoReporte === "produccion") {
        kpisReporte.replaceChildren(
            crearKpiTablero("Camiones", String(totalCamionesKpi), "En el filtro actual", "🚚", "verde"),
            crearKpiTablero("Clientes", String(clientesKpi), detallePeriodoKpi, "👥", "azul"),
            crearKpiTablero("Litros comprados", formatoLitrosTablero(litrosComprados), detallePeriodoKpi, "🥛", "verde")
        );
    }
    kpisReporte.classList.toggle("cuatro-kpis", kpisReporte.childElementCount === 4);
    kpisReporte.classList.toggle("tres-kpis", kpisReporte.childElementCount === 3);
    const configuracionTipo = {
        produccion: ["Producci\u00f3n", "Litros comprados a clientes por periodo"],
        descuentos: ["Descuentos", "Soles descontados por cliente y periodo"],
        adelantos: ["Adelantos", "Soles entregados por cliente y periodo"],
        ganancias: ["Venta por proveedor", "Soles registrados por proveedor y periodo"],
        perdidas: ["Pérdida por camión", "Litros recogidos menos litros descargados por periodo"]
    }[tipoReporte] || ["Producci\u00f3n", "Litros comprados a clientes por periodo"];
    const tituloTendencia = document.querySelector(".panel-tendencia .titulo-panel-tablero h3");
    if (tituloTendencia) tituloTendencia.textContent = tipoReporte === "ganancias"
        ? configuracionTipo[0]
        : tipoReporte === "perdidas" || (selectorCamion.value === "todos" && !["produccion", "descuentos", "adelantos"].includes(tipoReporte))
            ? `${configuracionTipo[0]} por cami\u00f3n`
            : `${configuracionTipo[0]} por cliente`;
    const subtituloTendencia = document.querySelector(".panel-tendencia .titulo-panel-tablero p");
    if (subtituloTendencia) subtituloTendencia.textContent = configuracionTipo[1];

    const leyendaTendencia = $id("leyendaClientesTendenciaTablero");
    if (leyendaTendencia) {
        leyendaTendencia.replaceChildren();
        datos.tendenciaClientes.forEach(serie => {
            const elemento = document.createElement("span");
            const punto = document.createElement("i");
            punto.style.backgroundColor = serie.color;
            const nombre = document.createElement("span");
            nombre.textContent = serie.nombre;
            elemento.append(punto, nombre);
            leyendaTendencia.appendChild(elemento);
        });
    }
    dibujarTendenciaTablero(
        $id("graficoTendenciaTablero"),
        tipoReporte === "perdidas" ? datos.tendenciaDiaria : datos.tendencia,
        datos.tendenciaClientes,
        ["descuentos", "adelantos", "ganancias"].includes(tipoReporte) ? "S/" : "L"
    );
    const graficoCamiones = $id("graficoCamionesTablero");
    const panelComparacion = document.querySelector(".panel-comparacion-camiones");
    const esProduccion = tipoReporte === "produccion";
    const mostrarLeyendaSeries = ["produccion", "descuentos", "adelantos", "ganancias", "perdidas"].includes(tipoReporte);
    const tituloComparacion = $id("tituloComparacionTablero");
    const subtituloComparacion = $id("subtituloComparacionTablero");
    const leyendaMetricasCamion = $id("leyendaMetricasCamionTablero");
    if (panelComparacion) panelComparacion.hidden = !mostrarLeyendaSeries;
    if (tituloComparacion) tituloComparacion.textContent = esProduccion
        ? "Camiones"
        : tipoReporte === "ganancias"
            ? "Proveedores"
            : tipoReporte === "adelantos" ? "Adelantos" : tipoReporte === "perdidas" ? "Pérdida" : "Descuentos";
    if (subtituloComparacion) subtituloComparacion.textContent = esProduccion
        ? "Litros recogidos / descargados"
        : tipoReporte === "perdidas"
            ? "Litros recogidos menos descargados"
            : tipoReporte === "ganancias"
            ? "Por proveedor en el periodo elegido"
            : "Por cliente en el periodo elegido";
    if (leyendaMetricasCamion) leyendaMetricasCamion.hidden = !esProduccion;
    const comparacionConLeyenda = panelComparacion?.querySelector(".comparacion-con-leyenda");
    comparacionConLeyenda?.classList.toggle("solo-leyenda", !esProduccion);
    graficoCamiones.hidden = !esProduccion;
    graficoCamiones.replaceChildren();
    const maximoCamion = Math.max(1, ...datos.tarjetas.flatMap(dato => [dato.recogido, dato.descargado]));
    datos.tarjetas.forEach((dato, indice) => {
        const fila = document.createElement("div");
        fila.className = "fila-grafico-camion-tablero";
        const nombre = document.createElement("strong");
        nombre.textContent = `C${lista.findIndex(camion => String(camion.id) === String(dato.camion.id)) + 1}`;
        const lineas = document.createElement("div");
        lineas.className = "lineas-grafico-camion-tablero";
        [[dato.recogido, "barra-recogido"], [dato.descargado, "barra-descargado"]].forEach(([valor, clase]) => {
            const pista = document.createElement("div");
            pista.className = "pista-barra-tablero";
            const barra = document.createElement("span");
            barra.className = clase;
            barra.style.width = `${(valor / maximoCamion) * 100}%`;
            pista.appendChild(barra);
            lineas.appendChild(pista);
        });
        const cifra = document.createElement("small");
        cifra.textContent = `${formatoLitrosTablero(dato.recogido)} / ${formatoLitrosTablero(dato.descargado)}`;
        fila.append(nombre, lineas, cifra);
        graficoCamiones.appendChild(fila);
    });
    if (!datos.tarjetas.length) graficoCamiones.textContent = "No hay camiones para mostrar.";

    const tabla = $id("filasDetalleTablero");
    if (tabla) {
    tabla.replaceChildren();
    datos.tarjetas.forEach((dato, indice) => {
        const diferenciaCamion = dato.recogido - dato.descargado;
        const promedio = dato.recogido > 0 ? dato.valorProduccion / dato.recogido : 0;
        const fila = document.createElement("tr");
        [
            `Camión ${lista.findIndex(camion => String(camion.id) === String(dato.camion.id)) + 1}`,
            dato.camion.placa || "—",
            dato.clientes.size.toLocaleString("es-PE"),
            formatoLitrosTablero(dato.recogido),
            formatoLitrosTablero(dato.descargado),
            formatoLitrosTablero(diferenciaCamion),
            formatoSolesTablero(diferenciaCamion * promedio)
        ].forEach((valor, columna) => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            if (columna === 5) celda.className = diferenciaCamion < 0 ? "balance-negativo-tablero" : "balance-positivo-tablero";
            fila.appendChild(celda);
        });
        tabla.appendChild(fila);
    });
    if (datos.descargadoSinCamion > 0 && selectorCamion.value === "todos") {
        const fila = document.createElement("tr");
        fila.className = "fila-sin-camion-tablero";
        ["Sin camión asignado", "—", "—", "0 L", formatoLitrosTablero(datos.descargadoSinCamion), formatoLitrosTablero(-datos.descargadoSinCamion), "—"].forEach(valor => {
            const celda = document.createElement("td"); celda.textContent = valor; fila.appendChild(celda);
        });
        tabla.appendChild(fila);
    }
    }

    if (clienteTableroSeleccionado) renderizarDetalleClienteTablero(datos, clienteTableroSeleccionado);
    else if ($id("detalleClienteTablero")) $id("detalleClienteTablero").hidden = true;
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */

function iniciarAdministrador() {
    limpiarProduccionCaducada();
    aplicarColorEmpresa();
    actualizarEncabezado();
    configurarReportes();
    mostrarVehiculos();
    mostrarVehiculosClientes();
    mostrarVehiculosProduccion();
    configurarProveedoresDescarga();
    $id("botonVerContrasenaVehiculo")?.addEventListener("click", () => {
        const campo = $id("contrasenaVehiculo");
        const boton = $id("botonVerContrasenaVehiculo");
        if (!campo || !boton) return;
        const mostrar = campo.type === "password";
        campo.type = mostrar ? "text" : "password";
        boton.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
        boton.title = mostrar ? "Ocultar contraseña" : "Mostrar contraseña";
    });
    $id("botonVerContrasenaAdministrador")?.addEventListener("click", () => {
        const campo = $id("contrasenaAdministrador");
        const boton = $id("botonVerContrasenaAdministrador");
        if (!campo || !boton) return;
        const mostrar = campo.type === "password";
        campo.type = mostrar ? "text" : "password";
        boton.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
        boton.title = mostrar ? "Ocultar contraseña" : "Mostrar contraseña";
    });
    $id("buscarClienteFinanzas")?.addEventListener("input", mostrarClientesFinanzas);
    $id("formularioAdelantoFinanzas")?.addEventListener("submit", registrarAdelantoFinanzas);
    $id("tipoDescuentoFinanzas")?.addEventListener("change", actualizarCampoQuincenasFinanzas);
    $id("botonGuardarDescuentoFinanzas")?.addEventListener("click", guardarDescuentoSeleccionadoFinanzas);
    $id("botonEditarFinanzas")?.addEventListener("click", editarAdelantoSeleccionadoFinanzas);
    $id("botonEliminarFinanzas")?.addEventListener("click", eliminarAdelantoSeleccionadoFinanzas);
    $id("camionDescargaSeleccionado")?.addEventListener("change", evento => {
        camionDescargaSeleccionado = evento.target.value;
        if (proveedorDescargaActual) renderizarRegistroDescargaProveedor();
    });
    ["tableroTipoReporte", "tableroAgrupacion", "tableroCamion"].forEach(id => {
        $id(id)?.addEventListener("change", actualizarDashboard);
    });
    $id("tableroCliente")?.addEventListener("change", () => {
        actualizarDashboard();
        if ($id("tableroCliente").value !== "todos") {
            $id("detalleClienteTablero")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
    $id("cerrarDetalleClienteTablero")?.addEventListener("click", () => {
        clienteTableroSeleccionado = null;
        if ($id("tableroCliente")) $id("tableroCliente").value = "todos";
        actualizarDashboard();
    });
    actualizarCampoQuincenasFinanzas();
    abrirSeccion("dashboard");

    window.setInterval(() => {
        const panelTablas = $id("panelTablasProduccion");
        if (
            !panelTablas ||
            panelTablas.hidden ||
            !clienteProduccionActual ||
            edicionProduccionActiva
        ) {
            return;
        }

        if (periodoProduccionSeleccionado !== obtenerPeriodoActual()) {
            renderizarTablasProduccion();
        }
    }, 60000);

    window.setInterval(() => {
        if (proveedorDescargaActual && periodoDescargaSeleccionado !== obtenerPeriodoActual()) {
            renderizarRegistroDescargaProveedor();
        }
    }, 60000);
}

async function iniciarAdministradorConSesion() {
    // Borra la marca temporal de la antigua entrada local. El administrador
    // solo abre con sesión real de Supabase para que los cambios vayan a la nube.
    sessionStorage.removeItem("camwebAccesoLocalTemporal");
    if (!window.camwebSupabase) {
        alert("No se pudo cargar Supabase. Revisa tu conexión a internet.");
        return;
    }
    const { data, error } = await window.camwebSupabase.auth.getSession();
    if (error || !data.session) {
        window.location.href = new URL("../VEHICULOS/index.html", window.location.href).href;
        return;
    }
    try {
        await window.camwebDataBridge.syncInitial();
    } catch (syncError) {
        console.error("No se pudieron sincronizar los datos:", syncError);
        alert("No se pudo sincronizar. Ejecuta el script SQL de Camweb en Supabase y vuelve a intentarlo.");
    }
    iniciarAdministrador();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarAdministradorConSesion);
} else {
    iniciarAdministradorConSesion();
}

/* =========================================================
   SINCRONIZAR CAMBIOS ENTRE PESTAÑAS
========================================================= */

window.addEventListener("storage", function (evento) {
    if (evento.key === CLAVE_COLOR_EMPRESA || evento.key === null) {
        aplicarColorEmpresa();
    }

    if (
        [CLAVE_VEHICULOS, CLAVE_CLIENTES_POR_VEHICULO, CLAVE_CLIENTES_ARCHIVADOS_REPORTES,
            CLAVE_PRODUCCION, CLAVE_REGISTROS_DESCARGA, null].includes(evento.key) &&
        $id("seccionDashboard") && !$id("seccionDashboard").hidden
    ) {
        actualizarDashboard();
    }

    if (evento.key === CLAVE_PROVEEDORES_DESCARGA || evento.key === null) {
        mostrarProveedoresDescarga();
    }
    if (evento.key === CLAVE_REGISTROS_DESCARGA && proveedorDescargaActual) {
        renderizarRegistroDescargaProveedor();
    }

    if (
        evento.key === CLAVE_LOGO ||
        evento.key === CLAVE_NOMBRE ||
        evento.key === null
    ) {
        actualizarEncabezado();
    }

    if (
        [CLAVE_VEHICULOS, CLAVE_CLIENTES_POR_VEHICULO, CLAVE_CLIENTES_ARCHIVADOS_REPORTES, CLAVE_PRODUCCION,
            CLAVE_FINANZAS, CLAVE_LOGO, CLAVE_NOMBRE, null].includes(evento.key) &&
        $id("seccionReporte") && !$id("seccionReporte").hidden
    ) {
        if (vehiculoReporteActual) renderizarReportes();
        else mostrarVehiculosReportes();
    }

    if (
        evento.key === CLAVE_VEHICULOS ||
        evento.key === null
    ) {
        mostrarVehiculos();
        mostrarVehiculosClientes();
        mostrarVehiculosProduccion();
        actualizarDashboard();
        if (proveedorDescargaActual) renderizarRegistroDescargaProveedor();

        if (vehiculoProduccionActual) {
            const actualizado = leerVehiculos().find(
                vehiculo =>
                    String(vehiculo.id) ===
                    String(vehiculoProduccionActual.id)
            );

            if (actualizado) {
                vehiculoProduccionActual = actualizado;

                if (!clienteProduccionActual) {
                    ingresarClientesProduccion(actualizado.id);
                }
            } else {
                volverListaCamionesProduccion();
            }
        }
    }

    if (
        evento.key === CLAVE_CLIENTES_POR_VEHICULO ||
        evento.key === null
    ) {
        if (vehiculoClientesActual) {
            mostrarListaClientesAdmin();
        }

        if (vehiculoProduccionActual && !clienteProduccionActual) {
            mostrarClientesProduccion();
        }

        if (clienteProduccionActual && vehiculoProduccionActual) {
            const clienteActualizado = leerClientesDeVehiculo(
                vehiculoProduccionActual.id
            ).find(
                cliente =>
                    String(cliente.id) ===
                    String(clienteProduccionActual.id)
            );

            if (clienteActualizado) {
                clienteProduccionActual = clienteActualizado;

                if ($id("nombreClienteTablasProduccion")) {
                    $id("nombreClienteTablasProduccion").textContent =
                        clienteActualizado.nombre;
                }

                if ($id("datosClienteTablasProduccion")) {
                    $id("datosClienteTablasProduccion").textContent =
                        "Precio por litro: S/ " +
                        formatearPrecio(clienteActualizado.precio);
                }
            } else {
                volverListaClientesProduccion();
            }
        }
    }

    if (
        evento.key === CLAVE_PRODUCCION ||
        evento.key === null
    ) {
        if (clienteProduccionActual) {
            renderizarTablasProduccion();
        }

        if (vehiculoProduccionActual && !clienteProduccionActual) {
            mostrarClientesProduccion();
        }
    }
});

window.addEventListener("camweb:synced", () => {
    aplicarColorEmpresa();
    actualizarEncabezado();
});
