/* ===== Textos, rankings, gráficos y mapa ===== */
document.addEventListener("DOMContentLoaded", () => {
    // Datos: única fuente para textos y cuadrículas
    const datos = {
        universidades: { total: 1504, origen: 173, destino: 136 },
        escuelas: { total: 303, origen: 151, destino: 54 },
    };

    document.querySelectorAll("[data-dato]").forEach((el) => {
        const [grupo, campo] = el.dataset.dato.split(".");
        el.textContent = datos[grupo][campo];
    });

    // Cuadrículas de ranking
    const ranking = (id, { total, origen, destino }) => {
        const min = Math.min(origen, destino);
        const max = Math.max(origen, destino);
        const celdas = Array.from({ length: total }, (_, i) => {
            const n = i + 1;
            const clase =
                n === destino ? "destino" : n === origen ? "origen" : n > min && n < max ? "entre" : "";
            return `<span class="${clase}">${n}</span>`;
        });
        document.getElementById(id).innerHTML = celdas.join("");
    };

    ranking("universidades", datos.universidades);
    ranking("escuelas", datos.escuelas);

    // Gráficos de radar
    const azul = { borderColor: "rgb(54, 162, 235)", backgroundColor: "rgba(54, 162, 235, 0.2)" };
    const rojo = { borderColor: "rgb(255, 99, 132)", backgroundColor: "rgba(255, 99, 132, 0.2)" };

    const radar = (id, labels, datasets, min = 0) =>
        new Chart(document.getElementById(id), {
            type: "radar",
            data: { labels, datasets },
            options: { scales: { r: { min, max: 100 } } },
        });

    // Radar 1: QS World University Rankings 2027, 9 indicadores (puntaje 0-100)
    radar(
        "comparaUniversidades",
        [
            "Reputación académica",
            "Reputación empleadores",
            "Docentes por estudiante",
            "Citas por docente",
            "Docentes internacionales",
            "Estudiantes internacionales",
            "Red de investigación",
            "Resultados de empleo",
            "Sostenibilidad",
        ],
        [
            {
                label: "Origen: U. de Chile",
                data: [92, 85.1, 9.9, 16, 10.6, 8.2, 76.8, 95.7, 66.4],
                ...azul,
            },
            { label: "Destino: UNAM", data: [99.3, 91.8, 38.1, 4.2, 11, 3.1, 95.2, 94.2, 80.4], ...rojo },
        ]
    );

    // Radar 2: SVG interactivo (QS Arte y Diseño 2026)
    const radarSVG = (raiz, { ejes, max, paso, radio, series }) => {
        const NS = "http://www.w3.org/2000/svg";
        const svg = raiz.querySelector("svg");
        const area = raiz.querySelector(".area");
        const leyenda = raiz.querySelector(".leyenda");
        const info = raiz.querySelector(".info");

        const crear = (tag, attrs = {}, padre) => {
            const nodo = document.createElementNS(NS, tag);
            Object.entries(attrs).forEach(([k, v]) => nodo.setAttribute(k, v));
            if (padre) padre.append(nodo);
            return nodo;
        };
        const fmt = (n) => n.toLocaleString("es-CL", { minimumFractionDigits: 1 });
        const angulo = (i) => ((-90 + i * 120) * Math.PI) / 180; // 3 ejes: arriba, abajo-derecha, abajo-izquierda
        const punto = (i, r) => [r * Math.cos(angulo(i)), r * Math.sin(angulo(i))];
        const aRadio = (valor) => (valor / max) * radio;
        const coords = (puntos) => puntos.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");

        // Grilla, ejes y escala
        for (let v = paso; v <= max; v += paso) {
            crear(
                "polygon",
                { class: "grilla", points: coords(ejes.map((_, i) => punto(i, aRadio(v)))) },
                area
            );
        }
        ejes.forEach((nombre, i) => {
            const [x, y] = punto(i, radio);
            crear("line", { class: "eje", x1: 0, y1: 0, x2: x, y2: y }, area);
            const [tx, ty] = punto(i, radio + 12);
            crear(
                "text",
                { x: tx, y: i === 0 ? ty - 2 : ty + 5, "text-anchor": ["middle", "start", "end"][i] },
                area
            ).textContent = nombre;
        });
        for (let v = paso; v <= max; v += paso) {
            crear("text", { class: "escala", x: 0, y: -aRadio(v), dy: "0.35em" }, area).textContent = v;
        }

        // Interacción
        const resaltar = (id) => {
            raiz.classList.toggle("hay-activa", Boolean(id));
            raiz.querySelectorAll(".serie").forEach((s) =>
                s.classList.toggle("activa", s.dataset.serie === id)
            );
        };

        const mostrarInfo = (evento, s, i) => {
            const lineas = [ejes[i], `${s.corto}: ${fmt(s.valores[i])} puntos`];
            if (s.lugares?.[i]) lineas.push(`Lugar mundial: ${s.lugares[i]}`);

            const texto = info.querySelector("text");
            texto.textContent = "";
            lineas.forEach((linea, n) => {
                const t = crear("tspan", { x: 10, dy: n === 0 ? 18 : "1.35em" }, texto);
                if (n === 0) t.setAttribute("font-weight", "bold");
                t.textContent = linea;
            });
            info.setAttribute("visibility", "visible");

            const caja = texto.getBBox();
            const rect = info.querySelector("rect");
            rect.setAttribute("width", caja.width + 20);
            rect.setAttribute("height", caja.height + 14);

            const p = svg.createSVGPoint();
            p.x = evento.clientX;
            p.y = evento.clientY;
            const { x, y } = p.matrixTransform(svg.getScreenCTM().inverse());
            const px = Math.min(Math.max(x - (caja.width + 20) / 2, 4), 720 - caja.width - 24);
            info.setAttribute("transform", `translate(${px}, ${Math.max(y - caja.height - 30, 4)})`);
        };
        const ocultarInfo = () => info.setAttribute("visibility", "hidden");

        // Series y leyenda
        series.forEach((s) => {
            const color = `rgb(${s.rgb})`;
            const relleno = `rgba(${s.rgb}, 0.2)`;
            const grupo = crear("g", { class: "serie", "data-serie": s.id }, area);
            const puntos = s.valores.map((v, i) => punto(i, aRadio(v)));

            crear("polygon", { points: coords(puntos), stroke: color, fill: relleno }, grupo);

            puntos.forEach(([x, y], i) => {
                const posicion = { cx: x.toFixed(1), cy: y.toFixed(1) };
                crear("circle", { class: "punto", ...posicion, r: 3, fill: relleno, stroke: color }, grupo);
                const zona = crear(
                    "circle",
                    {
                        class: "zona",
                        ...posicion,
                        r: 12,
                        tabindex: 0,
                        "aria-label": `${s.nombre}, ${ejes[i]}: ${fmt(s.valores[i])}`,
                    },
                    grupo
                );
                const entrar = (e) => (resaltar(s.id), mostrarInfo(e, s, i));
                const salir = () => (resaltar(null), ocultarInfo());
                zona.addEventListener("pointerenter", entrar);
                zona.addEventListener("pointermove", (e) => mostrarInfo(e, s, i));
                zona.addEventListener("pointerleave", salir);
                zona.addEventListener("focus", () => {
                    const c = zona.getBoundingClientRect();
                    entrar({ clientX: c.left + c.width / 2, clientY: c.top + c.height / 2 });
                });
                zona.addEventListener("blur", salir);
            });

            const boton = document.createElement("button");
            boton.type = "button";
            boton.setAttribute("aria-pressed", "true");
            boton.innerHTML = `<span class="muestra" style="--color: ${color}; --relleno: ${relleno}"></span>${s.nombre}`;
            boton.addEventListener("pointerenter", () => resaltar(s.id));
            boton.addEventListener("pointerleave", () => resaltar(null));
            boton.addEventListener("focus", () => resaltar(s.id));
            boton.addEventListener("blur", () => resaltar(null));
            boton.addEventListener("click", () => {
                const oculta = grupo.classList.toggle("oculta");
                boton.setAttribute("aria-pressed", String(!oculta));
            });
            leyenda.append(boton);
        });
    };

    radarSVG(document.getElementById("radarEscuelas"), {
        ejes: ["Reputación académica", "Reputación empleadores", "Puntaje general"],
        max: 100,
        paso: 20,
        radio: 150,
        series: [
            {
                id: "uchile",
                nombre: "Origen: U. de Chile",
                corto: "U. de Chile",
                rgb: "54, 162, 235",
                valores: [52.5, 78.5, 55.1],
                lugares: [null, null, "151–200"],
            },
            {
                id: "unam",
                nombre: "Destino: UNAM",
                corto: "UNAM",
                rgb: "255, 99, 132",
                valores: [63.9, 81.6, 65.7],
                lugares: [null, null, "54"],
            },
        ],
    });

    // Mapa
    const map = L.map("map").setView([19.332, -99.188], 3);

    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16, attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ" }
    ).addTo(map);

    L.marker([19.332, -99.188])
        .addTo(map)
        .bindPopup("<b>Universidad Nacional Autónoma de México</b><br />Facultad de Artes y Diseño.")
        .openPopup();
});

/* ===== Infografía: proceso Nivel FAU ===== */
(() => {
    /* ===== 1. DATOS: edita aquí los textos ===== */
    const PASOS = [
        {
            t: "Requisitos",
            d: "Ser estudiante regular cursando al menos el 3er semestre de tu carrera, con promedio ponderado 4.5, arancel al día y sin matrícula de gracia.",
            i: "M9 4h6v3H9z M7 5H5v15h14V5h-2 M9 13l2 2 4-4",
        },
        {
            t: "Documentación",
            d: "En el formulario de postulación elige 3 universidades en orden de preferencia y 6 materias tentativas a cursar. Adjunta: carta de motivación académica, certificado de idioma o carta de compromiso, y pasaporte o comprobante de solicitud de cita previa.",
            i: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6",
        },
        {
            t: "Selección",
            d: "Se evalúa mediante un ranking de notas para distribuir los cupos asignados. Se notifica por email el destino asignado (y la oferta de cupos sobrantes si no hubo asignación inicial).",
            i: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12l3 3 5-6",
        },
        {
            t: "Adjudicación",
            d: "Al ser asignado el cupo de movilidad, puedes aceptarlo o rechazarlo mediante un documento firmado vía email, en un plazo de siete días desde que lo recibes.",
            i: "M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M8.5 12.5L7 21l5-3 5 3-1.5-8.5",
        },
        {
            t: "Admisión",
            d: "La condición oficial de intercambio se alcanza únicamente tras obtener la Carta de Aceptación emitida por la universidad extranjera de destino.",
            i: "M5 21V4h9v17 M14 8h5v13 M3 21h18 M11 12v2",
        },
    ];

    /* ===== 2. CONSTRUCCIÓN DEL SVG ===== */
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs = {}, txt) => {
        const n = document.createElementNS(NS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (txt !== undefined) n.textContent = txt;
        return n;
    };
    const envolver = (texto, max) => { // salto de línea automático
        const out = [];
        let l = "";
        texto.split(" ").forEach((p) => {
            if ((l + " " + p).trim().length > max) {
                out.push(l);
                l = p;
            } else l = (l + " " + p).trim();
        });
        return out.concat(l);
    };

    const svg = document.getElementById("infoFAU");
    const cont = document.getElementById("pasosFAU");
    const alto = (p) => 130 + 20 * envolver(p.d, 33).length; // alto de cada paso
    const POS = [];
    PASOS.forEach((p, i) => {
        const previo = i ? POS[i - 1] + 170 : 240; // separación mínima entre pasos
        const mismoLado = i > 1 ? POS[i - 2] + alto(PASOS[i - 2]) + 30 : 0;
        POS.push(Math.max(previo, mismoLado));
    });
    const fin = POS[POS.length - 1] + alto(PASOS[PASOS.length - 1]) + 20;
    svg.setAttribute("viewBox", `0 0 760 ${fin}`);
    document.getElementById("ejeFAU").setAttribute("y2", fin - 10);

    PASOS.forEach((p, i) => {
        const izq = i % 2 === 0; // alterna izquierda / derecha
        const y = POS[i];
        const cx = izq ? 60 : 700;
        const tx = izq ? 350 : 410;
        const ancla = izq ? "end" : "start";
        const g = el("g", {
            class: "paso",
            tabindex: 0,
            role: "button",
            "aria-label": `Paso ${i + 1}: ${p.t}. ${p.d}`,
        });
        g.style.transformOrigin = `${izq ? 365 : 395}px ${y}px`;

        // guía punteada + punto sobre la línea central
        g.append(el("line", { class: "guia", x1: izq ? cx + 30 : 380, x2: izq ? 380 : cx - 30, y1: y, y2: y }));
        g.append(el("circle", { class: "punto", cx: 380, cy: y, r: 5 }));

        // círculo + icono
        g.append(el("circle", { class: "circulo", cx, cy: y, r: 30 }));
        g.append(el("path", { class: "icono", d: p.i, transform: `translate(${cx - 14.4} ${y - 14.4}) scale(1.2)` }));

        // texto
        const lineasD = envolver(p.d, 33);
        const yTit = y + 90,
            yDesc = yTit + 34;
        const altoBloque = yDesc - y + lineasD.length * 20 + 6;
        g.append(el("rect", { class: "bloque", x: izq ? 95 : 395, y: y + 22, width: 270, height: altoBloque, rx: 14 }));
        g.append(el("text", { class: "etq", x: tx, y: y + 52, "text-anchor": ancla }, `PASO ${i + 1}`));
        g.append(el("text", { class: "tit", x: tx, y: yTit, "text-anchor": ancla }, p.t));
        const d = el("text", { class: "desc", x: tx, y: yDesc, "text-anchor": ancla });
        lineasD.forEach((ln, k) => d.append(el("tspan", { x: tx, dy: k ? 20 : 0 }, ln)));
        g.append(d);

        // interacción: mouse, toque y teclado
        const activar = () => {
            svg.classList.add("hay-activo");
            cont.querySelectorAll(".paso").forEach((s) => s.classList.toggle("activo", s === g));
        };
        g.addEventListener("pointerenter", activar);
        g.addEventListener("focus", activar);
        g.addEventListener("click", activar);
        cont.append(g);
    });

    // al salir del gráfico vuelve al estado normal (todo igual de visible)
    const limpiar = () => {
        svg.classList.remove("hay-activo");
        cont.querySelectorAll(".paso").forEach((s) => s.classList.remove("activo"));
    };
    svg.addEventListener("pointerleave", limpiar);
    svg.addEventListener("focusout", (e) => {
        if (!svg.contains(e.relatedTarget)) limpiar();
    });
})();

