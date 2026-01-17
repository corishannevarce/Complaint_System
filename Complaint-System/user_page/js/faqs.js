// FAQ toggle function
function toggleFAQ(button) {
    const faqItem = button.parentElement;
    const content = button.nextElementSibling;
    const icon = button.querySelector('.faq-icon');
    
    faqItem.classList.toggle('active');
    
    if (faqItem.classList.contains('active')) {
        icon.style.transform = 'rotate(180deg)';
        content.style.maxHeight = content.scrollHeight + 'px';
    } else {
        icon.style.transform = 'rotate(0deg)';
        content.style.maxHeight = '0';
    }
}