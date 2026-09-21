document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-edicion');
    const toast = document.getElementById('alertaguardado');
    const mensajeError = document.getElementById('mensaje-error');

    // Mapear campos de exámenes para el cálculo automático
    const inputExamenes = form.querySelector('input[data-campo="examenes"]');
    const input75100 = form.querySelector('input[data-campo="exam_75100"]');
    const input50 = form.querySelector('input[data-campo="exam_50"]');
    const input25 = form.querySelector('input[data-campo="exam_25"]');
    const inputM25 = form.querySelector('input[data-campo="exam_m25"]');

    // Mapear campos de Total alumnos y 15% Desvío
    const inputTotal = form.querySelector('input[data-campo="total"]');
    const inputDesvio = form.querySelector('input[data-campo="desvio"]');

    // Cálculo automático de Exámenes
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

    // Cálculo automático del 15% Desvío (sin decimales y con tope máximo de 3)
    if (inputTotal && inputDesvio) {
        inputTotal.addEventListener('input', () => {
            const totalAlumnos = parseInt(inputTotal.value, 10);
            if (!isNaN(totalAlumnos) && totalAlumnos > 0) {
                const desvioCalculado = Math.floor(totalAlumnos * 0.15);
                inputDesvio.value = Math.min(desvioCalculado, 3);
            } else {
                inputDesvio.value = '';
            }
        });
    }

    // Evento de envío del formulario
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

        // Actualizar datos en la tabla superior mediante data-campo
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
                    celdaDestino.textContent = valor;
                }
            }
        });

        // Notificación Toast
        toast.classList.add("mostrar");
        setTimeout(() => {
            toast.classList.remove("mostrar");
        }, 3000);
    });

    // --- FUNCIÓN PARA EXPORTAR A CSV (Excel) ---
    const btnDescargar = document.getElementById('btn-descargar-excel');
    
    if (btnDescargar) {
        btnDescargar.addEventListener('click', (e) => {
            e.preventDefault(); // Evita recargar la página o saltar arriba
            
            const displayTable = document.querySelector('.caja-scroll table');
            if (!displayTable) {
                console.error("No se encontró la tabla de datos.");
                return;
            }

            let csvContent = "";
            const idGuiaElement = document.querySelector('[data-campo="idguia"]');
            const idGuia = idGuiaElement ? idGuiaElement.textContent.trim() : "Datos_Curso";
            
            // Recorrer filas de la tabla de visualización
            for (let i = 0; i < displayTable.rows.length; i++) {
                let row = displayTable.rows[i];
                let rowData = [];
                
                for (let j = 0; j < row.cells.length; j++) {
                    let cell = row.cells[j];
                    let cellText = cell.innerText.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');
                    rowData.push(`"${cellText}"`);
                }
                
                csvContent += rowData.join(";") + "\r\n";
            }
            
            // Generación y descarga del archivo CSV/Excel
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            
            link.setAttribute("href", url);
            link.setAttribute("download", `Reporte_${idGuia.replace(/\//g, '-')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Libera memoria
        });
    }
});
