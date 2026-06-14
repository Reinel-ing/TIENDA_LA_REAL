document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');

    if (toggle) {
        toggle.addEventListener('click', function () {
            sidebar.classList.toggle('collapsed');
            content.classList.toggle('expanded');
        });
    }

    // Auto-dismiss alerts after 4s
    document.querySelectorAll('.alert').forEach(function (alert) {
        setTimeout(function () {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }, 4000);
    });
});

function formatMoney(n) {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(Math.round(n));
}

function confirmDelete(form, nombre) {
    if (confirm('¿Eliminar "' + nombre + '"? Esta acción no se puede deshacer.')) {
        form.submit();
    }
}
