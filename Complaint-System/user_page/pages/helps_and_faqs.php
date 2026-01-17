<!-- helps_and_faqs.php -->
<link rel="stylesheet" href="styles/helps_and_faqs.css">
<div class="main-content">
    <h1 class="greeting">Help and FAQs</h1>
    <p class="subtitle">Find answers to common questions</p>
    
    <div class="faq-container">
        <h2>Frequently Asked Questions</h2>
        
        <div class="faq-item">
            <button class="faq-header" onclick="toggleFAQ(this)">
                <h3>How do I submit a complaint?</h3>
                <span class="material-symbols-rounded faq-icon">expand_more</span>
            </button>
            <p class="faq-content">Click the "Add New Complaint" button on the home page, select the complaint type, and provide a detailed description of your issue.</p>
        </div>
        
        <div class="faq-item">
            <button class="faq-header" onclick="toggleFAQ(this)">
                <h3>How long does it take to resolve a complaint?</h3>
                <span class="material-symbols-rounded faq-icon">expand_more</span>
            </button>
            <p class="faq-content">Resolution time varies depending on the complexity of the issue. Most complaints are resolved within 3-5 business days.</p>
        </div>
        
        <div class="faq-item">
            <button class="faq-header" onclick="toggleFAQ(this)">
                <h3>Can I track my complaint status?</h3>
                <span class="material-symbols-rounded faq-icon">expand_more</span>
            </button>
            <p class="faq-content">Yes! Your complaints are organized in three categories: Pending, In Progress, and Resolved. You can see real-time updates on your dashboard.</p>
        </div>
        
        <div class="faq-item">
            <button class="faq-header" onclick="toggleFAQ(this)">
                <h3>What types of complaints can I submit?</h3>
                <span class="material-symbols-rounded faq-icon">expand_more</span>
            </button>
            <p class="faq-content">You can submit complaints related to: Maintenance, Facility issues, Noise complaints, and Billing concerns.</p>
        </div>
        
        <div class="faq-item">
            <button class="faq-header" onclick="toggleFAQ(this)">
                <h3>Can I delete my complaints?</h3>
                <span class="material-symbols-rounded faq-icon">expand_more</span>
            </button>
            <p class="faq-content">You can only delete complaints that have been resolved. Pending and In Progress complaints cannot be deleted.</p>
        </div>
        
        <div class="faq-item">
            <button class="faq-header" onclick="toggleFAQ(this)">
                <h3>How do I export my complaint receipt?</h3>
                <span class="material-symbols-rounded faq-icon">expand_more</span>
            </button>
            <p class="faq-content">Go to the Complaint History page and click the "Export PDF" button on any resolved complaint to download your receipt.</p>
        </div>
    </div>
</div>

<script>
function toggleFAQ(button) {
    const faqItem = button.parentElement;
    const content = button.nextElementSibling;
    const icon = button.querySelector('.faq-icon');
    
    // Toggle active class
    faqItem.classList.toggle('active');
    
    // Rotate icon
    if (faqItem.classList.contains('active')) {
        icon.style.transform = 'rotate(180deg)';
        content.style.maxHeight = content.scrollHeight + 'px';
    } else {
        icon.style.transform = 'rotate(0deg)';
        content.style.maxHeight = '0';
    }
}
</script>