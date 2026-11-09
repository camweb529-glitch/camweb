"use strict";

const CLAVE_FOTO_ENCABEZADO_GERENTE = "camwebFotoEncabezadoGerente";
const CLAVE_FOTOS_ZONAS_PLANO = "camwebFotosZonasPlanoGerente";
const CLAVE_COLOR_TEMA = "camwebColorEmpresa";
const NOMBRES_ZONAS = {
    encabezado: "ENCABEZADO",
    izquierda: "LATERAL IZQUIERDO",
    centro: "ÁREA CENTRAL",
    derecha: "LATERAL DERECHO"
};

let fotoEncabezadoActual = null;
let fotosZonasActuales = {};
let zonaEncuadreSeleccionada = null;
let arrastreFoto = null;

function configuracionFoto(imagen = "", datos = {}) {
    return {
        imagen,
        activo: datos.activo !== false,
        x: Math.max(0, Math.min(100, Number(datos.x ?? 50))),
        y: Math.max(0, Math.min(100, Number(datos.y ?? 50))),
        zoom: Math.max(50, Math.min(250, Number(datos.zoom ?? 100))),
        modo: datos.modo === "contain" ? "contain" : "cover"
    };
}

function leerConfiguracionFotoEncabezado() {
    const guardado = localStorage.getItem(CLAVE_FOTO_ENCABEZADO_GERENTE);
    if (!guardado) return null;
    try {
        const datos = JSON.parse(guardado);
        if (datos && typeof datos === "object" && datos.imagen !== undefined) {
            return configuracionFoto(datos.imagen, datos);
        }
    } catch {}
    return configuracionFoto(guardado);
}

function leerColorPrincipal() {
    const guardado = localStorage.getItem(CLAVE_COLOR_TEMA) || "#246b38";
    return /^#[0-9a-f]{6}$/i.test(guardado) ? guardado : "#246b38";
}

function rgbaDesdeHex(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function leerFotosZonasPlano() {
    try {
        const fotos = JSON.parse(localStorage.getItem(CLAVE_FOTOS_ZONAS_PLANO) || "{}");
        if (!fotos || typeof fotos !== "object" || Array.isArray(fotos)) return {};
        Object.keys(fotos).forEach(zona => {
            const guardada = typeof fotos[zona] === "string" ? { imagen: fotos[zona] } : fotos[zona];
            fotos[zona] = configuracionFoto(guardada?.imagen || "", guardada || {});
        });
        return fotos;
    } catch {
        return {};
    }
}

function actualizarBotonEstadoFoto(zona, activo, tieneFoto) {
    const boton = document.querySelector(`[data-toggle-foto="${zona}"]`);
    if (!boton) return;
    boton.textContent = tieneFoto && activo ? "DESACTIVAR" : "ACTIVAR";
    boton.setAttribute("aria-pressed", String(tieneFoto && activo));
}

function dibujarCapaFoto(elemento, config, intensidad = 0.2) {
    if (!elemento) return;
    let capa = elemento.querySelector(":scope > .capa-foto-zona");
    if (!config?.imagen || !config.activo) {
        capa?.remove();
        return;
    }
    if (!capa) {
        capa = document.createElement("div");
        capa.className = "capa-foto-zona";
        elemento.insertBefore(capa, elemento.firstChild);
    }
    let imagen = capa.querySelector("img");
    if (!imagen) {
        imagen = document.createElement("img");
        imagen.alt = "Foto seleccionada";
        imagen.draggable = false;
        capa.appendChild(imagen);
    }
    const color = leerColorPrincipal();
    const colorBase = elemento.classList.contains("centro-plano") || elemento.classList.contains("panel-central")
        ? "#ffffff"
        : color;
    capa.style.backgroundColor = colorBase;
    capa.style.setProperty("--tinte-foto", rgbaDesdeHex(color, intensidad));
    imagen.src = config.imagen;
    imagen.style.objectFit = config.modo;
    imagen.style.objectPosition = `${config.x}% ${config.y}%`;
    imagen.style.transform = `scale(${config.zoom / 100})`;
}

function actualizarEstadoVisualZona(zona, config, vista) {
    const fotoActiva = Boolean(config?.imagen) && config.activo;
    const indicacion = vista.querySelector(
        zona === "encabezado" ? ".indicacion-foto-encabezado" : ".indicacion-foto-zona"
    );
    vista.classList.toggle("con-foto", fotoActiva);
    vista.classList.toggle("foto-desactivada", !config?.activo);
    actualizarBotonEstadoFoto(zona, fotoActiva, Boolean(config?.imagen));
    if (indicacion) {
        if (!config?.activo) indicacion.textContent = "FOTO DESACTIVADA";
        else if (fotoActiva) indicacion.textContent = zona === "encabezado" ? "CAMBIAR FOTO DEL ENCABEZADO" : "CAMBIAR FOTO";
        else indicacion.textContent = zona === "encabezado" ? "📷 SUBIR FOTO PARA EL ENCABEZADO" : "📷 SUBIR FOTO";
    }
}

function mostrarFotoZonaPlano(zona, config) {
    const color = leerColorPrincipal();
    const cuadro = document.querySelector(`[data-zona-foto="${zona}"]`);
    const destino = {
        izquierda: document.querySelector(".panel-izquierdo"),
        centro: document.querySelector(".panel-central"),
        derecha: document.querySelector(".panel-derecho")
    }[zona];
    if (destino) {
        destino.style.backgroundColor = config?.activo && config.imagen ? color : "";
        dibujarCapaFoto(destino, config, zona === "centro" ? 0 : 0.2);
    }
    if (cuadro) {
        cuadro.style.backgroundColor = color;
        dibujarCapaFoto(cuadro, config, zona === "centro" ? 0 : 0.2);
        actualizarEstadoVisualZona(zona, config || configuracionFoto());
        cuadro.classList.toggle("cuadro-seleccionado", zonaEncuadreSeleccionada === zona);
    }
}

function mostrarFotoEncabezadoGerente(config) {
    const encabezado = document.querySelector(".encabezado");
    const cuadro = document.querySelector(".encabezado-plano");
    if (encabezado) {
        encabezado.style.backgroundColor = config?.activo && config.imagen ? leerColorPrincipal() : "";
        dibujarCapaFoto(encabezado, config, 0.28);
    }
    if (cuadro) {
        cuadro.style.backgroundColor = leerColorPrincipal();
        dibujarCapaFoto(cuadro, config, 0.28);
        actualizarEstadoVisualZona("encabezado", config || configuracionFoto());
        cuadro.classList.toggle("cuadro-seleccionado", zonaEncuadreSeleccionada === "encabezado");
    }
}

function obtenerConfiguracionSeleccionada() {
    if (zonaEncuadreSeleccionada === "encabezado") return fotoEncabezadoActual;
    return fotosZonasActuales[zonaEncuadreSeleccionada] || null;
}

function guardarConfiguracionZona(zona, config) {
    try {
        if (zona === "encabezado") {
            fotoEncabezadoActual = config;
            mostrarFotoEncabezadoGerente(config);
            localStorage.setItem(CLAVE_FOTO_ENCABEZADO_GERENTE, JSON.stringify(config));
        } else {
            fotosZonasActuales[zona] = config;
            mostrarFotoZonaPlano(zona, config);
            localStorage.setItem(CLAVE_FOTOS_ZONAS_PLANO, JSON.stringify(fotosZonasActuales));
        }
        return true;
    } catch (error) {
        console.error("No se pudo guardar la configuración de la foto:", error);
        alert("No se pudo guardar la foto en este navegador. Prueba con una imagen más pequeña y vuelve a intentarlo.");
        return false;
    }
}

function actualizarPanelEncuadre() {
    const panel = document.getElementById("ajustesEncuadreFoto");
    const config = obtenerConfiguracionSeleccionada();
    const visible = Boolean(config?.imagen) && config.activo;
    if (panel) panel.hidden = !visible;
    document.querySelectorAll("[data-zona-foto], .encabezado-plano").forEach(cuadro => {
        const zona = cuadro.dataset.zonaFoto || "encabezado";
        cuadro.classList.toggle("cuadro-seleccionado", visible && zona === zonaEncuadreSeleccionada);
    });
    document.querySelector(".panel-central")?.classList.toggle("encuadre-activo", visible);
    if (!visible) return;

    const titulo = document.getElementById("zonaEncuadreSeleccionada");
    if (titulo) titulo.textContent = `AJUSTANDO: ${NOMBRES_ZONAS[zonaEncuadreSeleccionada]}`;
    const horizontal = document.getElementById("posicionHorizontalFoto");
    const vertical = document.getElementById("posicionVerticalFoto");
    const zoom = document.getElementById("zoomFoto");
    if (horizontal) horizontal.value = String(config.x);
    if (vertical) vertical.value = String(config.y);
    if (zoom) zoom.value = String(config.zoom);
    document.querySelectorAll("[data-modo-encuadre]").forEach(boton => {
        boton.setAttribute("aria-pressed", String(boton.dataset.modoEncuadre === config.modo));
    });
    document.querySelectorAll("[data-posicion-x]").forEach(boton => {
        const coincide = Math.abs(config.x - Number(boton.dataset.posicionX)) <= 2
            && Math.abs(config.y - Number(boton.dataset.posicionY)) <= 2;
        boton.setAttribute("aria-pressed", String(coincide));
    });
}

function seleccionarZonaEncuadre(zona) {
    zonaEncuadreSeleccionada = zona;
    actualizarPanelEncuadre();
    if (zona === "encabezado") mostrarFotoEncabezadoGerente(fotoEncabezadoActual || configuracionFoto());
    else mostrarFotoZonaPlano(zona, fotosZonasActuales[zona] || configuracionFoto());
}

function enfocarControlesEncuadre() {
    requestAnimationFrame(() => {
        document.getElementById("ajustesEncuadreFoto")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
}

function actualizarEncuadreSeleccionado(propiedad, valor, guardar = false) {
    const config = obtenerConfiguracionSeleccionada();
    if (!config?.imagen || !config.activo) return;
    config[propiedad] = valor;
    if (zonaEncuadreSeleccionada === "encabezado") mostrarFotoEncabezadoGerente(config);
    else mostrarFotoZonaPlano(zonaEncuadreSeleccionada, config);
    actualizarPanelEncuadre();
    if (guardar) guardarConfiguracionZona(zonaEncuadreSeleccionada, config);
}

function leerFotoComoEncabezado(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onerror = () => reject(new Error("No se pudo leer la foto."));
        lector.onload = () => {
            const imagen = new Image();
            imagen.onerror = () => reject(new Error("El archivo no es una imagen válida."));
            imagen.onload = () => {
                // Reducir las fotos evita que el almacenamiento local del navegador se llene.
                const escala = Math.min(1, 1000 / imagen.naturalWidth, 700 / imagen.naturalHeight);
                const lienzo = document.createElement("canvas");
                lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
                lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
                const contexto = lienzo.getContext("2d");
                if (!contexto) {
                    reject(new Error("No se pudo preparar la foto."));
                    return;
                }
                contexto.fillStyle = "#ffffff";
                contexto.fillRect(0, 0, lienzo.width, lienzo.height);
                contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
                resolve(lienzo.toDataURL("image/jpeg", 0.62));
            };
            imagen.src = String(lector.result);
        };
        lector.readAsDataURL(archivo);
    });
}

function configurarArrastreFoto(cuadro, zona) {
    cuadro.addEventListener("pointerdown", evento => {
        seleccionarZonaEncuadre(zona);
        if (evento.target.closest("button, .selector-foto-plano")) return;
        const config = zona === "encabezado" ? fotoEncabezadoActual : fotosZonasActuales[zona];
        if (!config?.imagen || !config.activo) return;
        evento.preventDefault();
        cuadro.setPointerCapture(evento.pointerId);
        arrastreFoto = {
            zona,
            puntero: evento.pointerId,
            xInicial: evento.clientX,
            yInicial: evento.clientY,
            xFoto: config.x,
            yFoto: config.y,
            ancho: Math.max(1, cuadro.clientWidth),
            alto: Math.max(1, cuadro.clientHeight)
        };
    });

    cuadro.addEventListener("pointermove", evento => {
        if (!arrastreFoto || arrastreFoto.zona !== zona || arrastreFoto.puntero !== evento.pointerId) return;
        const config = obtenerConfiguracionSeleccionada();
        if (!config) return;
        config.x = Math.max(0, Math.min(100, arrastreFoto.xFoto - (evento.clientX - arrastreFoto.xInicial) * 100 / arrastreFoto.ancho));
        config.y = Math.max(0, Math.min(100, arrastreFoto.yFoto - (evento.clientY - arrastreFoto.yInicial) * 100 / arrastreFoto.alto));
        if (zona === "encabezado") mostrarFotoEncabezadoGerente(config);
        else mostrarFotoZonaPlano(zona, config);
        actualizarPanelEncuadre();
    });

    const terminarArrastre = evento => {
        if (!arrastreFoto || arrastreFoto.zona !== zona || arrastreFoto.puntero !== evento.pointerId) return;
        const config = obtenerConfiguracionSeleccionada();
        arrastreFoto = null;
        if (config) guardarConfiguracionZona(zona, config);
    };
    cuadro.addEventListener("pointerup", terminarArrastre);
    cuadro.addEventListener("pointercancel", terminarArrastre);
}

function iniciarGerenteGeneral() {
    document.querySelector('[data-opcion-gerente="planos"]')?.addEventListener("click", () => {
        const vista = document.getElementById("vistaPlanos");
        if (vista) vista.hidden = false;
    });

    fotoEncabezadoActual = leerConfiguracionFotoEncabezado();
    fotosZonasActuales = leerFotosZonasPlano();
    mostrarFotoEncabezadoGerente(fotoEncabezadoActual || configuracionFoto());
    Object.entries(fotosZonasActuales).forEach(([zona, config]) => mostrarFotoZonaPlano(zona, config));

    configurarArrastreFoto(document.querySelector(".encabezado-plano"), "encabezado");
    document.querySelectorAll(".zona-subida-plano").forEach(cuadro => {
        configurarArrastreFoto(cuadro, cuadro.dataset.zonaFoto);
    });

    document.getElementById("archivoFotoEncabezado")?.addEventListener("change", async evento => {
        const archivo = evento.target.files?.[0];
        if (!archivo) return;
        try {
            const imagen = await leerFotoComoEncabezado(archivo);
            fotoEncabezadoActual = configuracionFoto(imagen, { x: 50, y: 50, zoom: 100, modo: "cover", activo: true });
            guardarConfiguracionZona("encabezado", fotoEncabezadoActual);
            seleccionarZonaEncuadre("encabezado");
            enfocarControlesEncuadre();
        } catch (error) {
            console.error("No se pudo guardar la foto del encabezado:", error);
            alert("No se pudo cargar la foto. Elige un archivo de imagen JPG, PNG o WEBP e inténtalo de nuevo.");
        }
        evento.target.value = "";
    });

    document.querySelectorAll("[data-archivo-zona]").forEach(selector => {
        selector.addEventListener("change", async evento => {
            const archivo = evento.target.files?.[0];
            const zona = evento.target.dataset.archivoZona;
            if (!archivo || !zona) return;
            try {
                const imagen = await leerFotoComoEncabezado(archivo);
                fotosZonasActuales[zona] = configuracionFoto(imagen, { x: 50, y: 50, zoom: 100, modo: "cover", activo: true });
                guardarConfiguracionZona(zona, fotosZonasActuales[zona]);
                seleccionarZonaEncuadre(zona);
                enfocarControlesEncuadre();
            } catch (error) {
                console.error("No se pudo guardar la foto del plano:", error);
                alert("No se pudo cargar la foto. Elige un archivo de imagen JPG, PNG o WEBP e inténtalo de nuevo.");
            }
            evento.target.value = "";
        });
    });

    document.querySelectorAll("[data-toggle-foto]").forEach(boton => {
        boton.addEventListener("click", () => {
            const zona = boton.dataset.toggleFoto;
            const config = zona === "encabezado"
                ? (fotoEncabezadoActual || configuracionFoto())
                : (fotosZonasActuales[zona] || configuracionFoto());
            if (!config.imagen) {
                const selector = zona === "encabezado"
                    ? document.getElementById("archivoFotoEncabezado")
                    : document.querySelector(`[data-archivo-zona="${zona}"]`);
                selector?.click();
                return;
            }
            config.activo = !config.activo;
            guardarConfiguracionZona(zona, config);
            if (zona === zonaEncuadreSeleccionada) actualizarPanelEncuadre();
        });
    });

    [["posicionHorizontalFoto", "x"], ["posicionVerticalFoto", "y"], ["zoomFoto", "zoom"]].forEach(([id, propiedad]) => {
        const control = document.getElementById(id);
        control?.addEventListener("input", () => actualizarEncuadreSeleccionado(propiedad, Number(control.value)));
        control?.addEventListener("change", () => {
            const config = obtenerConfiguracionSeleccionada();
            if (config) guardarConfiguracionZona(zonaEncuadreSeleccionada, config);
        });
    });

    document.querySelectorAll("[data-modo-encuadre]").forEach(boton => {
        boton.addEventListener("click", () => actualizarEncuadreSeleccionado("modo", boton.dataset.modoEncuadre, true));
    });

    document.querySelectorAll("[data-posicion-x]").forEach(boton => {
        boton.addEventListener("click", () => {
            const config = obtenerConfiguracionSeleccionada();
            if (!config?.imagen || !config.activo) return;
            config.x = Number(boton.dataset.posicionX);
            config.y = Number(boton.dataset.posicionY);
            guardarConfiguracionZona(zonaEncuadreSeleccionada, config);
            actualizarPanelEncuadre();
        });
    });

    window.addEventListener("storage", evento => {
        if (evento.key === CLAVE_COLOR_TEMA || evento.key === null) {
            fotoEncabezadoActual = leerConfiguracionFotoEncabezado();
            fotosZonasActuales = leerFotosZonasPlano();
            mostrarFotoEncabezadoGerente(fotoEncabezadoActual || configuracionFoto());
            Object.entries(fotosZonasActuales).forEach(([zona, config]) => mostrarFotoZonaPlano(zona, config));
            actualizarPanelEncuadre();
        }
    });
}

async function iniciarGerenteGeneralConSesion() {
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
        alert("No se pudieron cargar los datos de Supabase. Revisa la configuración de la base de datos.");
    }
    iniciarGerenteGeneral();
}

document.addEventListener("DOMContentLoaded", iniciarGerenteGeneralConSesion);
