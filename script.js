document.addEventListener('DOMContentLoaded', () => {
    // --- OBTENER Y FORMATEAR FECHA ACTUAL (DD-MM-AA) ---
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = String(hoy.getFullYear()).slice(-2); // Toma los últimos 2 dígitos del año
    const fechaActualFormateada = `${dia}-${mes}-${anio}`;

    // Inyectar la fecha actual en todos los encabezados marcados
    document.querySelectorAll('.fecha-eval-actual').forEach(el => {
        el.textContent = fechaActualFormateada;
    });

    const form = document.getElementById('form-edicion');
    const toast = document.getElementById('alertaguardado');
    const mensajeError = document.getElementById('mensaje-error');

    // Mapear campos de exámenes para el cálculo automático
    const inputExamenes = form.querySelector('input[data-campo="examenes"]');
    const input75100 = form.querySelector('input[data-campo="exam_75100"]');
    const input50 = form.querySelector('input[data-campo="exam_50"]');
    const input25 = form.querySelector('input[data-campo="exam_25"]');
    const inputM25 = form.querySelector('input[data-campo="exam_m25"]');

    // Mapear Total alumnos, Desvío y Subvencionables
    const inputTotal = form.querySelector('input[data-campo="total"]');
    const inputDesvio = form.querySelector('input[data-campo="desvio"]');
    const inputMaxSub = form.querySelector('input[data-campo="maxsub"]');
    const inputSubvencionables = form.querySelector('input[data-campo="subvencionables"]');

    // Grupos de sumas que no deben superar el Total de Alumnos
    const grupoEstado = [
        form.querySelector('input[data-campo="avanzados"]'),
        form.querySelector('input[data-campo="rezagados"]')
    ];

    const grupoPorcentajes = [
        form.querySelector('input[data-campo="alumnos_75100"]'),
        form.querySelector('input[data-campo="alumnos_50"]'),
        form.querySelector('input[data-campo="alumnos_25"]'),
        form.querySelector('input[data-campo="alumnos_m25"]')
    ];

    // --- 1. CÁLCULO AUTOMÁTICO DE EXÁMENES ---
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

    // --- 2. VALIDACIONES DE TOPES Y SUMAS ---
    const obtenerSumaExcluyendo = (grupo, inputExcluido) => {
        let suma = 0;
        grupo.forEach(input => {
            if (input !== inputExcluido && input.value) {
                suma += parseInt(input.value, 10) || 0;
            }
        });
        return suma;
    };

    const validarGrupoSuma = (grupo) => {
        grupo.forEach(input => {
            if (!input) return;
            input.addEventListener('input', (e) => {
                const totalAlumnos = parseInt(inputTotal.value, 10) || 0;
                const sumaOtros = obtenerSumaExcluyendo(grupo, e.target);
                const valorActual = parseInt(e.target.value, 10) || 0;

                if (sumaOtros + valorActual > totalAlumnos) {
                    const maxPermitido = Math.max(0, totalAlumnos - sumaOtros);
                    e.target.value = maxPermitido;
                }
            });
        });
    };

    validarGrupoSuma(grupoEstado);
    validarGrupoSuma(grupoPorcentajes);

    [inputMaxSub, inputSubvencionables].forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const totalAlumnos = parseInt(inputTotal.value, 10) || 0;
            const valorActual = parseInt(e.target.value, 10) || 0;
            if (valorActual > totalAlumnos) {
                e.target.value = totalAlumnos;
            }
        });
    });

    if (inputTotal) {
        inputTotal.addEventListener('input', () => {
            const totalAlumnos = parseInt(inputTotal.value, 10) || 0;
            
            if (totalAlumnos > 0) {
                const desvioCalculado = Math.floor(totalAlumnos * 0.15);
                inputDesvio.value = Math.min(desvioCalculado, 3);
            } else {
                inputDesvio.value = '';
            }

            [...grupoEstado, ...grupoPorcentajes, inputMaxSub, inputSubvencionables].forEach(input => {
                if (input && input.value !== '') {
                    input.dispatchEvent(new Event('input'));
                }
            });
        });
    }

    // --- 3. ENVÍO DEL FORMULARIO Y DESTELLO VISUAL ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        mensajeError.style.display = 'none';

        // Validar fechas
        const fechaInicio = form.querySelector('input[data-campo="fechainicio"]').value;
        const fechaFin = form.querySelector('input[data-campo="fechafin"]').value;
        
        if (fechaInicio && fechaFin) {
            const dInicio = new Date(fechaInicio);
            const dFin = new Date(fechaFin);
            
            if (dFin < dInicio) {
                mensajeError.textContent = "Error: La Fecha de Fin no puede ser anterior a la Fecha de Inicio.";
                mensajeError.style.display = 'block';
                return;
            }
        }

        // Actualizar datos y aplicar destello visual
        const inputs = form.querySelectorAll('input[data-campo]');
        inputs.forEach(input => {
            if (input.value.trim() !== '') {
                const campoNombre = input.getAttribute('data-campo');
                let valor = input.value.trim();

                if (input.type === 'date' && valor.includes('-')) {
                    const partes = valor.split('-');
                    valor = `${partes[2]}/${partes[1]}/${partes[0]}`;
                }

                const celdaDestino = document.querySelector(`.caja-scroll table [data-campo="${campoNombre}"]`);
                
                if (celdaDestino) {
                    if (celdaDestino.textContent.trim() !== valor) {
                        celdaDestino.textContent = valor;

                        const elementoAAnimar = celdaDestino.tagName.toLowerCase() === 'a' ? celdaDestino.parentElement : celdaDestino;

                        elementoAAnimar.classList.remove('celda-actualizada');
                        void elementoAAnimar.offsetWidth;
                        elementoAAnimar.classList.add('celda-actualizada');

                        setTimeout(() => {
                            elementoAAnimar.classList.remove('celda-actualizada');
                        }, 1500);
                    }
                }
            }
        });

        // Toast
        toast.classList.add("mostrar");
        setTimeout(() => {
            toast.classList.remove("mostrar");
        }, 3000);
    });

    // --- 4. FUNCIÓN PARA EXPORTAR A CSV ---
    const btnDescargar = document.getElementById('btn-descargar-excel');
    if (btnDescargar) {
        btnDescargar.addEventListener('click', (e) => {
            e.preventDefault();
            const displayTable = document.querySelector('.caja-scroll table');
            if (!displayTable) return;

            let csvContent = "";
            const idGuiaElement = document.querySelector('[data-campo="idguia"]');
            const idGuia = idGuiaElement ? idGuiaElement.textContent.trim() : "Datos_Curso";
            
            for (let i = 0; i < displayTable.rows.length; i++) {
                let row = displayTable.rows[i];
                let rowData = [];
                for (let j = 0; j < row.cells.length; j++) {
                    let cell = row.cells[j];
                    let cellText = cell.innserText.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');
                    rowData.push(`"${cellText}"`);
                }
                csvContent += rowData.join(";") + "\r\n";
            }
            
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            
            link.setAttribute("href", url);
            link.setAttribute("download", `Reporte_${idGuia.replace(/\//g, '-')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }
});
