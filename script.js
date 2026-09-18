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
});
