// Google Apps Script Web App URL (User needs to update this)
const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'; 

document.addEventListener('DOMContentLoaded', () => {
    toggleSections();
});

function toggleSections() {
    const serviceType = document.querySelector('input[name="serviceType"]:checked')?.value;
    
    // Hide all conditional sections first
    const sections = ['details-b2b', 'details-fulfillment', 'details-delivery', 'details-packmove', 'details-master-product'];
    sections.forEach(id => {
        document.getElementById(id).classList.add('hidden');
        // Disable inputs in hidden sections to prevent required validation errors
        toggleInputs(id, false);
    });

    if (!serviceType) return;

    // Show relevant sections based on selection
    if (serviceType === 'General' || serviceType === 'Cold') {
        showSection('details-b2b');
        showSection('details-master-product');
    } else if (serviceType === 'Fulfillment') {
        showSection('details-fulfillment');
        showSection('details-master-product');
    } else if (serviceType === 'Delivery') {
        showSection('details-delivery');
        showSection('details-master-product');
    } else if (serviceType === 'PackMove') {
        showSection('details-packmove');
        // Pack & Move has its own file upload, so maybe we don't need the common master product section?
        // The prompt implies "Check List for Delivery platform (B2G)" (Pack & Move) has its own specific fields.
        // It does NOT list "Master Product" in the Pack & Move section in the prompt.
        // So we keep master product hidden for Pack & Move.
    }
}

function showSection(id) {
    const section = document.getElementById(id);
    section.classList.remove('hidden');
    toggleInputs(id, true);
}

function toggleInputs(sectionId, isEnabled) {
    const section = document.getElementById(sectionId);
    const inputs = section.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (isEnabled) {
            // Restore required attribute if it was originally required
            // For simplicity, we might just rely on the fact that hidden inputs aren't submitted in standard forms,
            // but for JS validation, we need to be careful.
            // A better approach for this custom form is to remove 'required' when hidden and add it back when shown.
            // However, tracking which ones were required is tricky.
            // Let's just enable/disable them. Disabled inputs are not submitted.
            input.disabled = false;
        } else {
            input.disabled = true;
        }
    });
}

// Handle Form Submission
document.getElementById('enquiryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        alert('Please update the SCRIPT_URL in script.js with your deployed Google Apps Script URL.');
        return;
    }

    const submitBtn = document.querySelector('.btn-submit');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Show loading
    loadingOverlay.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        const formData = new FormData(this);
        const data = {};
        
        // Convert FormData to JSON object
        // Handle checkboxes (multiple values)
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        // Handle File Uploads (Convert to Base64)
        const fileInputs = document.querySelectorAll('input[type="file"]');
        const filesData = [];

        for (let input of fileInputs) {
            if (!input.disabled && input.files.length > 0) {
                for (let i = 0; i < input.files.length; i++) {
                    const file = input.files[i];
                    const base64 = await toBase64(file);
                    filesData.push({
                        name: file.name,
                        type: file.type,
                        data: base64,
                        fieldName: input.name
                    });
                }
            }
        }
        
        // Add files to data payload
        data.files = filesData;

        // Send to Google Apps Script
        // We use 'no-cors' mode usually for GAS, but that prevents reading response.
        // However, standard fetch to GAS requires redirect handling.
        // The best way for GAS JSON API is to use text/plain to avoid CORS preflight issues sometimes,
        // or just standard POST. Let's try standard POST with JSON stringified.
        
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        // Since we can't easily read response in no-cors or simple GAS webapp without complex setup,
        // we assume success if no network error occurred.
        
        loadingOverlay.classList.add('hidden');
        document.getElementById('successModal').classList.remove('hidden');
        this.reset();
        toggleSections(); // Reset UI

    } catch (error) {
        console.error('Error:', error);
        loadingOverlay.classList.add('hidden');
        alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
        submitBtn.disabled = false;
    }
});

function closeModal() {
    document.getElementById('successModal').classList.add('hidden');
    document.querySelector('.btn-submit').disabled = false;
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove the Data-URL declaration (e.g. "data:image/png;base64,")
            let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
            if ((encoded.length % 4) > 0) {
                encoded += '='.repeat(4 - (encoded.length % 4));
            }
            resolve(encoded);
        };
        reader.onerror = error => reject(error);
    });
}
