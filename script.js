// 1. IMPORTACIONES A NIVEL SUPERIOR
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// 2. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDMG3xErSJVSiZyCIse-epkeVm_53NhWjU",
    authDomain: "tabla-de-estudiantes-ffc91.firebaseapp.com",
    projectId: "tabla-de-estudiantes-ffc91",
    storageBucket: "tabla-de-estudiantes-ffc91.firebasestorage.app",
    messagingSenderId: "24438070380",
    appId: "1:24438070380:web:afb4df7b165272310c8c49"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const normalizarIdDoc = (id) => encodeURIComponent(id.trim().toUpperCase());

let cursoActualId = null;
// --- NUEVO: Variable para rastrear cambios sin guardar ---
window.hayCambiosSinGuardar = false;

// Alerta nativa del navegador al intentar cerrar la pestaña si hay cambios sin guardar
window.addEventListener('beforeunload', (e) => {
    if (window.hayCambiosSinGuardar) {
        e.preventDefault();
        e.returnValue = ''; 
    }
});

// Detectar cualquier escritura, pero IGNORAR si solo estamos escribiendo el ID a buscar
document.addEventListener('input', (e) => { 
    if (e.target.getAttribute('data-campo') !== 'idguia') window.hayCambiosSinGuardar = true; 
});
document.addEventListener('change', (e) => { 
    if (e.target.getAttribute('data-campo') !== 'idguia') window.hayCambiosSinGuardar = true; 
});

const animarElemento = (elemento) => {
    if (!elemento) return;
    elemento.classList.remove('celda-actualizada');
    void elemento.offsetWidth;
    elemento.classList.add('celda-actualizada');
    setTimeout(() => elemento.classList.remove('celda-actualizada'), 1500);
};

// 3. GUARDIÁN DE RUTA
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        console.log("Sesión activa:", user.email);
    }
});

// 4. LÓGICA DE LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {

    // Cerrar sesión
    const btnLogout = document.querySelector('a[href="login.html"]');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.hayCambiosSinGuardar && !confirm("Tienes cambios sin guardar. ¿Seguro que quieres salir?")) {
                return;
            }
            localStorage.removeItem('ultimoCursoActivo');
            signOut(auth).then(() => window.location.href = "login.html")
            .catch((error) => console.error("Error al salir", error));
        });
    }

    // Fecha actual formateada DD-MM-AA
    const hoy = new Date();
    const fechaActualFormateada = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getFullYear()).slice(-2)}`;
    document.querySelectorAll('.fecha-eval-actual').forEach(el => el.textContent = fechaActualFormateada);

    const form = document.getElementById('form-edicion');

    // Prevenir guardado accidental con la tecla Enter
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
            e.target.blur();
        }
    });

    const toast = document.getElementById('alertaguardado');
    const mensajeError = document.getElementById('mensaje-error');
    const tablaAlumnos = document.getElementById('tabla-alumnos');
    const inputIdGuia = form.querySelector('input[data-campo="idguia"]');

    // Sincronizar totales con la tabla superior
    window.sincronizarTotales = () => {
        if (!tablaAlumnos) return;
        
        const filas = tablaAlumnos.querySelectorAll('tbody tr');
        let totalReales = 0;
        let finalizados = 0;
        let rezagados = 0;

        filas.forEach(fila => {
            const c = fila.querySelectorAll('td');
            if (c.length < 19) return;

            const apellidos = c[1].innerText.trim();
            const nombre = c[2].innerText.trim();
            const email = c[4].innerText.trim();

            if (apellidos !== '' || nombre !== '' || (email !== '' && email !== 'escribe...')) {
                totalReales++;

                const select = fila.querySelector('.select-tipo-alumno');
                if (select) {
                    if (select.value === 'FINALIZADO') finalizados++;
                    else if (select.value === 'REZAGADO') rezagados++;
                }
            }
        });

        const inputTotal = form.querySelector('input[data-campo="total"]');
        const inputAvanzados = form.querySelector('input[data-campo="avanzados"]');
        const inputRezagados = form.querySelector('input[data-campo="rezagados"]');

        if (inputTotal) {
            inputTotal.value = totalReales;
            inputTotal.dispatchEvent(new Event('input')); 
        }
        if (inputAvanzados) inputAvanzados.value = finalizados;
        if (inputRezagados) inputRezagados.value = rezagados;

        const celdaTotal = document.querySelector('.caja-scroll table [data-campo="total"]');
        const celdaAvanzados = document.querySelector('.caja-scroll table [data-campo="avanzados"]');
        const celdaRezagados = document.querySelector('.caja-scroll table [data-campo="rezagados"]');

        if (celdaTotal) celdaTotal.textContent = totalReales;
        if (celdaAvanzados) celdaAvanzados.textContent = finalizados;
        if (celdaRezagados) celdaRezagados.textContent = rezagados;
    };

    // Reseteo para nuevo curso
    const resetearFormularioYTabla = (mantenerId = false) => {
        const idActual = inputIdGuia ? inputIdGuia.value : '';
        form.reset();
        mensajeError.style.display = 'none';

        if (mantenerId && inputIdGuia) {
            inputIdGuia.value = idActual;
            cursoActualId = idActual;
        } else {
            cursoActualId = null;
            localStorage.removeItem('ultimoCursoActivo');
        }

        document.querySelectorAll('.caja-scroll table [data-campo]').forEach(celda => {
            celda.textContent = '';
        });
        const c50 = document.getElementById('fecha-50');
        const c75 = document.getElementById('fecha-75');
        if (c50) c50.textContent = '';
        if (c75) c75.textContent = '';

        const tbody = tablaAlumnos.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = window.crearFilaHTML(1) + window.crearFilaHTML(2);
        }
        actualizarContadorAlumnos();
        window.sincronizarTotales();
        window.hayCambiosSinGuardar = false; // Estado limpio

        if (!mantenerId && inputIdGuia) inputIdGuia.focus();
    };

    const btnNuevoCurso = document.getElementById('btn-nuevo-curso');
    if (btnNuevoCurso) {
        btnNuevoCurso.addEventListener('click', () => {
            if (window.hayCambiosSinGuardar && !confirm("Tienes cambios sin guardar. ¿Deseas descartarlos y empezar un nuevo curso?")) {
                return;
            } else if (!window.hayCambiosSinGuardar && !confirm("¿Deseas vaciar la pantalla para registrar un nuevo curso?")) {
                return;
            }
            resetearFormularioYTabla(false);
        });
    }




   // --- BÚSQUEDA Y PREVENCIÓN DE SOBREESCRITURA ACCIDENTAL ---
    if (inputIdGuia) {
        inputIdGuia.addEventListener('blur', async (e) => {
            const idBuscado = e.target.value.trim().toUpperCase();
            e.target.value = idBuscado;

            if (idBuscado === '' || idBuscado === cursoActualId) return;

            // VALIDACIÓN DE FORMATO nn/nnnn
            const formatoValido = /^\d{2}\/\d{4}$/;
            if (!formatoValido.test(idBuscado)) {
                alert("Formato de ID incorrecto. Debe tener el formato numérico de dos dígitos, barra y cuatro dígitos (Ejemplo: 25/2846).");
                e.target.value = cursoActualId || ''; // Restauramos el ID anterior si se equivocó
                return;
            }

            try {
                const docRef = doc(db, "cursos", normalizarIdDoc(idBuscado));
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    let mensaje = `El curso "${idBuscado}" ya existe en la nube.\n\n¿Deseas cargarlo para editarlo?`;
                    if (window.hayCambiosSinGuardar) {
                        mensaje = `⚠️ ¡Atención! Tienes cambios sin guardar en pantalla que se perderán.\n\nEl curso "${idBuscado}" ya existe en la nube. ¿Deseas descartar lo que estabas haciendo y cargar este curso?`;
                    }

                    if (confirm(mensaje)) {
                        window.cargarDatosEnInterfaz(snap.data());
                        cursoActualId = idBuscado;
                        localStorage.setItem('ultimoCursoActivo', idBuscado);
                    } else {
                        e.target.value = cursoActualId || '';
                    }
                } else {
                    // Es un curso nuevo
                    if (cursoActualId && cursoActualId !== idBuscado) {
                        resetearFormularioYTabla(true);
                    }
                    cursoActualId = idBuscado;
                    localStorage.setItem('ultimoCursoActivo', idBuscado);
                }
            } catch (error) {
                console.error("Error buscando curso:", error);
            }
        });
    }



    // Mapeo de campos del formulario
    const inputExamenes = form.querySelector('input[data-campo="examenes"]');
    const input75100 = form.querySelector('input[data-campo="exam_75100"]');
    const input50 = form.querySelector('input[data-campo="exam_50"]');
    const input25 = form.querySelector('input[data-campo="exam_25"]');
    const inputM25 = form.querySelector('input[data-campo="exam_m25"]');
    const inputTotal = form.querySelector('input[data-campo="total"]');
    const inputDesvio = form.querySelector('input[data-campo="desvio"]');
    const inputMaxSub = form.querySelector('input[data-campo="maxsub"]');
    const inputSubvencionables = form.querySelector('input[data-campo="subvencionables"]');
    
    const grupoEstado = [form.querySelector('input[data-campo="avanzados"]'), form.querySelector('input[data-campo="rezagados"]')];
    const grupoPorcentajes = [
        form.querySelector('input[data-campo="alumnos_75100"]'),
        form.querySelector('input[data-campo="alumnos_50"]'),
        form.querySelector('input[data-campo="alumnos_25"]'),
        form.querySelector('input[data-campo="alumnos_m25"]')
    ];

    const calcularFechasPorcentajes = (inicioStr, finStr) => {
        if (!inicioStr || !finStr) return null;
        const [yI, mI, dI] = inicioStr.split('-').map(Number);
        const [yF, mF, dF] = finStr.split('-').map(Number);
        const fechaIni = new Date(yI, mI - 1, dI);
        const fechaFin = new Date(yF, mF - 1, dF);
        const diffTiempo = fechaFin.getTime() - fechaIni.getTime();
        if (diffTiempo < 0) return null;

        const totalDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
        const f50 = new Date(fechaIni); f50.setDate(f50.getDate() + Math.floor(totalDias * 0.50));
        const f75 = new Date(fechaIni); f75.setDate(f75.getDate() + Math.floor(totalDias * 0.75));

        const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        return { fecha50: fmt(f50), fecha75: fmt(f75) };
    };

    window.actualizarTablasSuperiores = () => {
        form.querySelectorAll('input[data-campo]').forEach(input => {
            if (input.value.trim() !== '') {
                const campoNombre = input.getAttribute('data-campo');
                let valor = input.value.trim();
                if (input.type === 'date' && valor.includes('-')) {
                    const partes = valor.split('-');
                    valor = `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
                const celdaDestino = document.querySelector(`.caja-scroll table [data-campo="${campoNombre}"]`);
                if (celdaDestino && celdaDestino.textContent.trim() !== valor) {
                    celdaDestino.textContent = valor;
                    animarElemento(celdaDestino.tagName.toLowerCase() === 'a' ? celdaDestino.parentElement : celdaDestino);
                }
            }
        });

        const fIni = form.querySelector('input[data-campo="fechainicio"]').value;
        const fFin = form.querySelector('input[data-campo="fechafin"]').value;
        if (fIni && fFin) {
            const res = calcularFechasPorcentajes(fIni, fFin);
            if (res) {
                const c50 = document.getElementById('fecha-50');
                const c75 = document.getElementById('fecha-75');
                if (c50 && c50.textContent !== res.fecha50) { c50.textContent = res.fecha50; animarElemento(c50); }
                if (c75 && c75.textContent !== res.fecha75) { c75.textContent = res.fecha75; animarElemento(c75); }
            }
        }
    };

    if (inputExamenes) {
        inputExamenes.addEventListener('input', () => {
            const total = parseInt(inputExamenes.value, 10);
            if (!isNaN(total) && total > 0) {
                input75100.value = Math.ceil(total * 0.75);
                input50.value = Math.ceil(total * 0.50);
                input25.value = Math.ceil(total * 0.25);
                inputM25.value = Math.floor(total * 0.25) || 1;
            } else {
                input75100.value = ''; input50.value = ''; input25.value = ''; inputM25.value = '';
            }
        });
    }

    const obtenerSumaExcluyendo = (grupo, inputExcluido) => {
        let suma = 0;
        grupo.forEach(input => { if (input !== inputExcluido && input.value) suma += parseInt(input.value, 10) || 0; });
        return suma;
    };

    const validarGrupoSuma = (grupo) => {
        grupo.forEach(input => {
            if (!input) return;
            input.addEventListener('input', (e) => {
                const totalAlumnos = parseInt(inputTotal.value, 10) || 0;
                const sumaOtros = obtenerSumaExcluyendo(grupo, e.target);
                const valorActual = parseInt(e.target.value, 10) || 0;
                if (sumaOtros + valorActual > totalAlumnos) e.target.value = Math.max(0, totalAlumnos - sumaOtros);
            });
        });
    };

    validarGrupoSuma(grupoEstado);
    validarGrupoSuma(grupoPorcentajes);

    [inputMaxSub, inputSubvencionables].forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const t = parseInt(inputTotal.value, 10) || 0;
            if (parseInt(e.target.value, 10) > t) e.target.value = t;
        });
    });

    if (inputTotal) {
        inputTotal.addEventListener('input', () => {
            const t = parseInt(inputTotal.value, 10) || 0;
            inputDesvio.value = t > 0 ? Math.min(Math.floor(t * 0.15), 3) : '';
            [...grupoEstado, ...grupoPorcentajes, inputMaxSub, inputSubvencionables].forEach(input => {
                if (input && input.value !== '') input.dispatchEvent(new Event('input'));
            });
        });
    }

    // --- GUARDAR EN FIRESTORE MANUALMENTE ---
    const btnGuardarSubmit = document.getElementById('botonguardar');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        mensajeError.style.display = 'none';

        const idGuiaFinal = inputIdGuia.value.trim().toUpperCase();
        if (!idGuiaFinal) {
            mensajeError.textContent = "Error: Debes asignar un 'ID Guía' para poder guardar el curso.";
            mensajeError.style.display = 'block';
            return;
        }

        // VALIDACIÓN DE FORMATO nn/nnnn
        const formatoValido = /^\d{2}\/\d{4}$/;
        if (!formatoValido.test(idGuiaFinal)) {
            mensajeError.textContent = "Error: El ID Guía debe tener formato de dos números, barra y cuatro números (ej: 25/2846).";
            mensajeError.style.display = 'block';
            inputIdGuia.focus();
            return;
        }

        // CAPA DE SEGURIDAD EXTREMA: Evitar pisar cursos no cargados
        if (idGuiaFinal !== cursoActualId) {
            try {
                const docRefTest = doc(db, "cursos", normalizarIdDoc(idGuiaFinal));
                const snapTest = await getDoc(docRefTest);
                if (snapTest.exists()) {
                    mensajeError.textContent = `Error de seguridad: El curso "${idGuiaFinal}" ya existe. Haz clic fuera de la casilla del ID para cargarlo primero.`;
                    mensajeError.style.display = 'block';
                    return;
                }
            } catch (err) {
                console.error("Error validando duplicado", err);
                return;
            }
        }
    
        

        const fIni = form.querySelector('input[data-campo="fechainicio"]').value;
        const fFin = form.querySelector('input[data-campo="fechafin"]').value;
        if (fIni && fFin && new Date(fFin) < new Date(fIni)) {
            mensajeError.textContent = "Error: La Fecha de Fin no puede ser anterior a la Fecha de Inicio.";
            mensajeError.style.display = 'block';
            return;
        }

        const listaAlumnos = [];
        const emailsVistos = new Set();
        let hayEmailDuplicado = false;

        const filasTabla = tablaAlumnos.querySelectorAll('tbody tr');
        
        for (let i = 0; i < filasTabla.length; i++) {
            const fila = filasTabla[i];
            const c = fila.querySelectorAll('td');
            if (c.length < 19) continue;

            const emailAlumno = (c[4].querySelector('a')?.innerText.trim() || c[4].innerText.trim()).toLowerCase();

            if (emailAlumno && emailAlumno !== 'escribe...' && emailAlumno !== '') {
                if (emailsVistos.has(emailAlumno)) {
                    hayEmailDuplicado = true;
                    mensajeError.textContent = `Error: El email "${emailAlumno}" está repetido. Corrige el duplicado antes de guardar.`;
                    mensajeError.style.display = 'block';
                    
                    c.forEach(td => td.style.setProperty('background-color', '#fee2e2', 'important'));
                    setTimeout(() => {
                        c.forEach(td => td.style.removeProperty('background-color'));
                    }, 4000);
                    break;
                }
                emailsVistos.add(emailAlumno);
            }

            listaAlumnos.push({
                check: c[0].querySelector('.check-alumno')?.checked ?? true,
                apellidos: c[1].innerText.trim(),
                nombre: c[2].innerText.trim(),
                tel: c[3].querySelector('a')?.innerText.trim() || c[3].innerText.trim(),
                email: emailAlumno,
                sLaboral: c[5].querySelector('select')?.value || 'Ocu',
                conexion1: c[6].innerText.trim(),
                conexionUlt: c[7].innerText.trim(),
                conexionTot: c[8].innerText.trim(),
                eco1: c[9].querySelector('input')?.checked || false,
                eco2: c[10].querySelector('input')?.checked || false,
                eco3: c[11].querySelector('input')?.checked || false,
                eco4: c[12].querySelector('input')?.checked || false,
                obsResp: c[13].innerText.trim(),
                obsRespColor: c[13].dataset.color || '#9ecc86',
                obsTutor: c[14].innerText.trim(),
                obsTutorColor: c[14].dataset.color || '#9ecc86',
                evRealizadas: c[15].innerText.trim(),
                contenidos: c[16].innerText.trim(),
                notaFinal: c[17].innerText.trim(),
                tipoAlumno: c[18].querySelector('select')?.value || 'FINALIZADO'
            });
        }

        if (hayEmailDuplicado) return;

        // --- EFECTO DE CARGA EN EL BOTÓN ---
        const textoOriginalBoton = btnGuardarSubmit.textContent;
        btnGuardarSubmit.disabled = true;
        btnGuardarSubmit.textContent = '⏳ Guardando en la nube...';
        btnGuardarSubmit.style.opacity = '0.7';
        btnGuardarSubmit.style.cursor = 'not-allowed';

        window.actualizarTablasSuperiores();

        const datosFormulario = {};
        form.querySelectorAll('input[data-campo]').forEach(input => {
            datosFormulario[input.getAttribute('data-campo')] = input.value;
        });

        try {
            const docRef = doc(db, "cursos", normalizarIdDoc(idGuiaFinal));
            await setDoc(docRef, {
                curso: datosFormulario,
                alumnos: listaAlumnos,
                actualizadoEn: new Date().toISOString(),
                modificadoPor: auth.currentUser?.email || "Desconocido"
            });

            // Registro en historial
            const historialRef = collection(db, "cursos", normalizarIdDoc(idGuiaFinal), "historial");
            await addDoc(historialRef, {
                usuario: auth.currentUser?.email || "Desconocido",
                fecha: new Date().toISOString(),
                accion: "Edición / Guardado de curso",
                totalAlumnos: listaAlumnos.length,
                tutor: datosFormulario.tutor || "No asignado"
            });

            cursoActualId = idGuiaFinal;
            localStorage.setItem('ultimoCursoActivo', idGuiaFinal);
            window.hayCambiosSinGuardar = false; // Se guardó con éxito

            toast.classList.add("mostrar");
            setTimeout(() => toast.classList.remove("mostrar"), 3000);
        } catch (error) {
            console.error("Error guardando en Firestore:", error);
            alert("Hubo un error guardando en la nube. Revisa la consola.");
        } finally {
            // Restaurar el botón siempre, haya error o éxito
            btnGuardarSubmit.disabled = false;
            btnGuardarSubmit.textContent = textoOriginalBoton;
            btnGuardarSubmit.style.opacity = '1';
            btnGuardarSubmit.style.cursor = 'pointer';
        }
    });

    const actualizarContadorAlumnos = () => {
        const contador = document.getElementById('contador-alumnos') || document.querySelector('.rango-paginacion');
        if (!contador || !tablaAlumnos) return;
        const totalVisibles = Array.from(tablaAlumnos.querySelectorAll('tbody tr')).filter(f => f.style.display !== 'none').length;
        contador.textContent = totalVisibles === 0 ? '0' : `1 - ${totalVisibles}`;
    };

    window.crearFilaHTML = (num, datos = {}) => {
        const tel = datos.tel || '';
        const email = datos.email || '';
        const numLimpio = tel.replace(/\D/g, '');
        const hrefTel = numLimpio.length > 5 ? `https://wa.me/34${numLimpio}` : '';
        const hrefMail = email.includes('@') ? `mailto:${email}` : '';
        const esRezagado = datos.tipoAlumno === 'REZAGADO';

        return `
            <td>${num}. <input type="checkbox" class="check-alumno" ${datos.check !== false ? 'checked' : ''}></td>
            <td class="col-verde-pastel link-alumno" contenteditable="true">${datos.apellidos || ''}</td>
            <td class="col-verde-pastel link-alumno" contenteditable="true">${datos.nombre || ''}</td>
            <td><a ${hrefTel ? `href="${hrefTel}" target="_blank"` : ''} class="link-tel" contenteditable="true" data-tipo="tel">${tel}</a></td>
            <td><a ${hrefMail ? `href="${hrefMail}"` : ''} class="link-mail" contenteditable="true" data-tipo="email">${email}</a></td>
            <td>
                <select class="select-laboral">
                    <option value="Ocu" ${datos.sLaboral === 'Ocu' ? 'selected' : ''}>Ocu</option>
                    <option value="Des" ${datos.sLaboral === 'Des' ? 'selected' : ''}>Des</option>
                </select>
            </td>
            <td class="col-rosa-pastel" contenteditable="true">${datos.conexion1 || ''}</td>
            <td class="col-rosa-pastel" contenteditable="true">${datos.conexionUlt || ''}</td>
            <td contenteditable="true">${datos.conexionTot || ''}</td>
            <td><label class="switch"><input type="checkbox" ${datos.eco1 ? 'checked' : ''}><span class="slider"></span></label></td>
            <td><label class="switch"><input type="checkbox" ${datos.eco2 ? 'checked' : ''}><span class="slider"></span></label></td>
            <td><label class="switch"><input type="checkbox" ${datos.eco3 ? 'checked' : ''}><span class="slider"></span></label></td>
            <td><label class="switch"><input type="checkbox" ${datos.eco4 ? 'checked' : ''}><span class="slider"></span></label></td>
            <td class="celda-observacion" data-color="${datos.obsRespColor || '#9ecc86'}" style="background-color: ${datos.obsRespColor || '#9ecc86'} !important;">${datos.obsResp || ''}</td>
            <td class="celda-observacion" data-color="${datos.obsTutorColor || '#9ecc86'}" style="background-color: ${datos.obsTutorColor || '#9ecc86'} !important;">${datos.obsTutor || ''}</td>
            <td class="col-verde-pastel" contenteditable="true">${datos.evRealizadas || ''}</td>
            <td contenteditable="true">${datos.contenidos || ''}</td>
            <td contenteditable="true">${datos.notaFinal || ''}</td>
            <td class="${esRezagado ? 'col-estado-rezagado' : 'col-estado-finalizado'}">
                <select class="select-tipo-alumno">
                    <option value="FINALIZADO" ${!esRezagado ? 'selected' : ''}>FINALIZADO</option>
                    <option value="REZAGADO" ${esRezagado ? 'selected' : ''}>REZAGADO</option>
                </select>
            </td>
        `;
    };

    // Añadir alumno
    const btnAgregarAlumno = document.getElementById('btn-agregar-alumno');
    if (btnAgregarAlumno && tablaAlumnos) {
        btnAgregarAlumno.addEventListener('click', () => {
            const tbody = tablaAlumnos.querySelector('tbody');
            const nuevoNumero = tbody.querySelectorAll('tr').length + 1;
            const nuevaFila = document.createElement('tr');
            nuevaFila.innerHTML = window.crearFilaHTML(nuevoNumero);
            tbody.appendChild(nuevaFila);
            actualizarContadorAlumnos();
            window.sincronizarTotales();
            window.hayCambiosSinGuardar = true;
        });
    }

    // Checkbox maestro
    const checkMaestro = document.getElementById('check-maestro');
    if (checkMaestro) {
        checkMaestro.addEventListener('change', function() {
            tablaAlumnos.querySelectorAll('.check-alumno').forEach(cb => cb.checked = this.checked);
            window.hayCambiosSinGuardar = true;
        });
    }

    // Enlaces reactivos en edición directa
    tablaAlumnos.addEventListener('input', (e) => {
        const elemento = e.target;
        if (elemento.getAttribute('data-tipo') === 'tel') {
            const limpio = elemento.innerText.replace(/\D/g, '');
            if (limpio.length > 5) {
                elemento.href = `https://wa.me/34${limpio}`;
                elemento.target = "_blank";
            } else {
                elemento.removeAttribute('href');
                elemento.removeAttribute('target');
            }
        }
        if (elemento.getAttribute('data-tipo') === 'email') {
            const correo = elemento.innerText.trim();
            if (correo.includes('@')) {
                elemento.href = `mailto:${correo}`;
            } else {
                elemento.removeAttribute('href');
            }
        }
    });

    tablaAlumnos.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.getAttribute('contenteditable') === 'true') {
            if (!e.target.getAttribute('href') || !e.ctrlKey) {
                e.preventDefault();
            }
        }
    });

    // Modal observaciones
    const modalObservaciones = document.getElementById('modal-observaciones');
    const modalTextarea = document.getElementById('modal-textarea');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalColor = document.getElementById('modal-color');
    let celdaActiva = null;

    const abrirModal = (celda, titulo) => {
        celdaActiva = celda;
        modalTitulo.textContent = titulo;
        const ahora = new Date();
        const timestamp = `${ahora.getDate()}/${ahora.getMonth() + 1}/${ahora.getFullYear()}, ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;
        const prev = celda.innerText.trim();
        modalTextarea.dataset.nuevoTimestamp = timestamp;
        modalTextarea.value = prev ? `${timestamp} \n${prev}` : `${timestamp} `;

        const colorGuardado = celda.dataset.color || '#9ecc86';
        modalColor.value = colorGuardado;
        modalColor.style.backgroundColor = colorGuardado;
        modalObservaciones.classList.remove('oculto');
        modalTextarea.focus();
        modalTextarea.setSelectionRange(timestamp.length + 1, timestamp.length + 1);
    };

    const cerrarModal = () => { modalObservaciones.classList.add('oculto'); celdaActiva = null; };

    if (modalColor) {
        modalColor.addEventListener('change', () => { modalColor.style.backgroundColor = modalColor.value; });
    }

    tablaAlumnos.addEventListener('click', (e) => {
        if (e.target.classList.contains('celda-observacion')) {
            const titulo = tablaAlumnos.querySelector('thead tr').cells[e.target.cellIndex].innerText.toUpperCase();
            abrirModal(e.target, titulo);
        }
    });

    document.getElementById('btn-cerrar-x')?.addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar-modal')?.addEventListener('click', cerrarModal);

    document.getElementById('btn-guardar-modal')?.addEventListener('click', () => {
        if (celdaActiva) {
            const time = modalTextarea.dataset.nuevoTimestamp;
            const lineas = modalTextarea.value.split('\n');
            celdaActiva.innerText = lineas[0].trim() === time ? (lineas.shift(), lineas.join('\n').trim()) : modalTextarea.value.trim();
            celdaActiva.dataset.color = modalColor.value;
            celdaActiva.style.setProperty('background-color', modalColor.value, 'important');
            window.hayCambiosSinGuardar = true;
        }
        cerrarModal();
    });

    // Eliminar alumnos
    const renumerarFilas = () => {
        tablaAlumnos.querySelectorAll('tbody tr').forEach((fila, i) => {
            const primerTd = fila.cells[0];
            const check = primerTd.querySelector('.check-alumno');
            primerTd.innerHTML = `${i + 1}. `;
            if (check) primerTd.appendChild(check);
        });
        actualizarContadorAlumnos();
        window.sincronizarTotales();
    };

    document.getElementById('btn-eliminar-alumno')?.addEventListener('click', () => {
        const filas = tablaAlumnos.querySelectorAll('tbody tr');
        if (filas.length === 0) return alert("No hay filas para eliminar.");
        const selec = Array.from(filas).filter(f => f.querySelector('.check-alumno')?.checked);
        if (selec.length > 0) {
            if (confirm(`¿Eliminar ${selec.length} alumno(s)?`)) {
                selec.forEach(f => f.remove());
                renumerarFilas();
                if (checkMaestro) checkMaestro.checked = false;
                window.hayCambiosSinGuardar = true;
            }
        } else if (confirm("¿Eliminar la última fila?")) {
            filas[filas.length - 1].remove();
            renumerarFilas();
            window.hayCambiosSinGuardar = true;
        }
    });

    // Cambio de estado en Tipo Alumno
    tablaAlumnos.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-tipo-alumno')) {
            const celda = e.target.closest('td');
            celda.classList.toggle('col-estado-rezagado', e.target.value === 'REZAGADO');
            celda.classList.toggle('col-estado-finalizado', e.target.value === 'FINALIZADO');
            window.sincronizarTotales();
            window.hayCambiosSinGuardar = true;
        }
    });

    // Buscador en tiempo real
    const inputBuscar = document.getElementById('buscador-alumnos') || document.querySelector('.caja-buscar input');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            const t = inputBuscar.value.trim().toLowerCase();
            tablaAlumnos.querySelectorAll('tbody tr').forEach(fila => {
                const txt = Array.from(fila.querySelectorAll('td')).map(td => td.querySelector('select')?.value || td.innerText).join(' ').toLowerCase();
                fila.style.display = txt.includes(t) ? '' : 'none';
            });
            actualizarContadorAlumnos();
        });
    }

    // Acordeón de tabla
    document.getElementById('btn-acordeon')?.addEventListener('click', function() {
        this.classList.toggle('abierto');
        document.getElementById('contenido-acordeon')?.classList.toggle('mostrar');
    });

    // Exportación a Excel CSV
    document.getElementById('btn-descargar-excel')?.addEventListener('click', (e) => {
        e.preventDefault();
        const tablaCurso = document.querySelector('.caja-scroll table');
        const tablaFechas = document.querySelectorAll('.caja-scroll table')[1];
        if (!tablaCurso) return;

        const idGuia = document.querySelector('[data-campo="idguia"]')?.textContent.trim() || "Datos_Curso";
        const fmt = (t) => `"${String(t || "").replace(/"/g, '""').trim()}"`;
        let csv = '"=== DATOS GENERALES DEL CURSO ==="\r\n';

        Array.from(tablaCurso.rows).forEach(r => {
            csv += Array.from(r.cells).map(c => fmt(c.innerText.replace(/\r?\n/g, ' '))).join(';') + '\r\n';
        });
        if (tablaFechas) {
            Array.from(tablaFechas.rows).forEach(r => {
                csv += Array.from(r.cells).map(c => fmt(c.innerText.replace(/\r?\n/g, ' '))).join(';') + '\r\n';
            });
        }
        csv += '\r\n\r\n"=== TABLA DE SEGUIMIENTO DE ALUMNOS ==="\r\n';
        csv += ["Nº", "Apellidos", "Nombre", "Teléfono", "Email", "S. Laboral", "1ª Conexión", "Última Conexión", "Conexión Total", "P.ECO 1 (Cuestionario)", "P.ECO 2 (Subida archivo)", "P.ECO 3 (Correo)", "P.ECO 4 (Foro)", "Observaciones Responsable", "Observaciones Tutor", "Ev. Realizadas", "Contenidos", "Nota Final", "Tipo Alumno"].map(fmt).join(';') + '\r\n';

        tablaAlumnos.querySelectorAll('tbody tr').forEach((fila, idx) => {
            const c = fila.querySelectorAll('td');
            if (c.length < 19) return;
            csv += [
                idx + 1, c[1].innerText, c[2].innerText, c[3].innerText.replace('💬', '').trim(), c[4].innerText,
                c[5].querySelector('select')?.value || '',
                c[6].innerText, c[7].innerText, c[8].innerText,
                c[9].querySelector('input')?.checked ? "SÍ" : "NO",
                c[10].querySelector('input')?.checked ? "SÍ" : "NO",
                c[11].querySelector('input')?.checked ? "SÍ" : "NO",
                c[12].querySelector('input')?.checked ? "SÍ" : "NO",
                c[13].innerText, c[14].innerText, c[15].innerText, c[16].innerText, c[17].innerText,
                c[18].querySelector('select')?.value || ''
            ].map(fmt).join(';') + '\r\n';
        });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `Reporte_Completo_${idGuia.replace(/[\/\\?%*:|"<>]/g, '-')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- LÓGICA DE APERTURA Y CARGA DEL HISTORIAL ---
    const btnVerHistorial = document.getElementById('btn-ver-historial');
    const modalHistorial = document.getElementById('modal-historial');
    const btnCerrarHistorial = document.getElementById('btn-cerrar-historial');
    const listaHistorialBody = document.getElementById('lista-historial-body');
    const modalHistorialTitulo = document.getElementById('modal-historial-titulo');

    if (btnVerHistorial) {
        btnVerHistorial.addEventListener('click', async () => {
            const idGuiaFinal = inputIdGuia ? inputIdGuia.value.trim().toUpperCase() : '';
            if (!idGuiaFinal) {
                alert("Escribe o carga primero un 'ID Guía' para poder ver su historial.");
                return;
            }

            modalHistorialTitulo.textContent = `HISTORIAL DE CAMBIOS - ${idGuiaFinal}`;
            listaHistorialBody.innerHTML = '<tr><td colspan="4" style="padding: 20px;">Consultando base de datos...</td></tr>';
            modalHistorial.classList.remove('oculto');

            try {
                const historialRef = collection(db, "cursos", normalizarIdDoc(idGuiaFinal), "historial");
                const q = query(historialRef, orderBy("fecha", "desc"), limit(30));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    listaHistorialBody.innerHTML = '<tr><td colspan="4" style="padding: 20px; color: #666;">No hay modificaciones registradas para este curso todavía.</td></tr>';
                    return;
                }

                listaHistorialBody.innerHTML = '';
                snapshot.forEach(docSnap => {
                    const h = docSnap.data();
                    const d = new Date(h.fecha);
                    const fechaTxt = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${fechaTxt}</td>
                        <td style="font-weight: 600; color: #1e40af;">${h.usuario}</td>
                        <td>${h.accion || 'Guardado'}</td>
                        <td><span class="badge-alumnos">${h.totalAlumnos ?? 0}</span></td>
                    `;
                    listaHistorialBody.appendChild(tr);
                });
            } catch (err) {
                console.error("Error al obtener historial:", err);
                listaHistorialBody.innerHTML = '<tr><td colspan="4" style="color: red; padding: 20px;">Error al consultar el historial en la base de datos.</td></tr>';
            }
        });
    }

    if (btnCerrarHistorial) {
        btnCerrarHistorial.addEventListener('click', () => {
            modalHistorial.classList.add('oculto');
        });
    }
});

// 5. CARGA PURA EN INTERFAZ
window.cargarDatosEnInterfaz = function(data) {
    if (!data) return;

    const form = document.getElementById('form-edicion');

    if (data.curso && form) {
        for (const [campo, valor] of Object.entries(data.curso)) {
            const input = form.querySelector(`input[data-campo="${campo}"]`);
            if (input) input.value = valor;
        }
        if (window.actualizarTablasSuperiores) {
            window.actualizarTablasSuperiores();
        }
    }

    if (data.alumnos && Array.isArray(data.alumnos)) {
        const tbody = document.querySelector('#tabla-alumnos tbody');
        if (tbody) {
            tbody.innerHTML = ''; 
            data.alumnos.forEach((alumno, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = window.crearFilaHTML(index + 1, alumno);
                tbody.appendChild(tr);
            });
            const contador = document.getElementById('contador-alumnos') || document.querySelector('.rango-paginacion');
            if (contador) contador.textContent = `1 - ${data.alumnos.length}`;
            
            if (window.sincronizarTotales) window.sincronizarTotales();
        }
    }
    
    // Al cargar de la base de datos, el estado está limpio
    window.hayCambiosSinGuardar = false; 
};
