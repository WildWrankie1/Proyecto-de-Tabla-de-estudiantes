
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const displayTable = document.querySelector('.caja-scroll table');
    const formTable = form.querySelector('table');

    

// Campos de exámenes en el formulario
    const inputExamenes = form.querySelector('input[name="examenes"]');
    const input75100 = form.querySelector('input[name="exam_75100"]');
    const input50 = form.querySelector('input[name="exam_50"]');
    const input25 = form.querySelector('input[name="exam_25"]');
    const inputM25 = form.querySelector('input[name="exam_m25"]');

    // Cálculo automático en tiempo real
    if (inputExamenes) {
        inputExamenes.addEventListener('input', () => {
            const total = parseInt(inputExamenes.value, 10);

            if (!isNaN(total) && total > 0) {
                input75100.value = Math.ceil(total * 0.75); // 75% - 100% (Redondeado arriba)
                input50.value = Math.ceil(total * 0.50);    // 50% (Redondeado arriba)
                input25.value = Math.ceil(total * 0.25);    // 25% (Redondeado arriba)
                inputM25.value = Math.floor(total * 0.25) || 1; // Menos del 25%
            } else {
                input75100.value = '';
                input50.value = '';
                input25.value = '';
                inputM25.value = '';
            }
        });
    }






    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Evita la recarga de la página

        // Recorre la cuadrícula del formulario y actualiza la tabla de arriba
        for (let r = 0; r < formTable.rows.length; r++) {
            const formRow = formTable.rows[r];
            const displayRow = displayTable.rows[r];

            for (let c = 0; c < formRow.cells.length; c++) {
                const input = formRow.cells[c].querySelector('input');

                // Solo actualiza las celdas donde se haya ingresado un valor
                if (input && input.value.trim() !== '') {
                    let valor = input.value.trim();

                    // Convierte formato de fecha YYYY-MM-DD a DD/MM/YYYY
                    if (input.type === 'date' && valor.includes('-')) {
                        const partes = valor.split('-');
                        valor = `${partes[2]}/${partes[1]}/${partes[0]}`;
                    }

                    const celdaDestino = displayRow.cells[c];
                    const enlace = celdaDestino.querySelector('a');

                    // Mantiene la etiqueta <a> si la celda contiene un enlace (ej: ID Guía)
                    if (enlace) {
                        enlace.textContent = valor;
                    } else {
                        celdaDestino.textContent = valor;
                    }
                }
            }
        }
    });
});
