// Filter functions
function applyFilters() {
    const type = document.getElementById('filter-type').value;
    const date = document.getElementById('filter-date').value;
    const month = document.getElementById('monthFilter').value;
    
    let url = '?page=home';
    if (type) url += '&type=' + type;
    if (date) url += '&date=' + date;
    if (month !== 'all') url += '&month=' + month;
    
    window.location.href = url;
}

function clearFilters() {
    window.location.href = '?page=home';
}