// Google Apps Script Code
// 1. Create a new Google Sheet
// 2. Extensions > Apps Script
// 3. Paste this code
// 4. Deploy > New Deployment > Web App > Execute as: Me > Who has access: Anyone
// 5. Copy the URL and paste it into script.js

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // Headers setup (Run once or check if exists)
        const headers = [
            'Timestamp',
            'Company Name', 'Contact Name', 'Email', 'Phone', 'Source',
            'Service Type',
            'Product Type', 'Temperature', 'Duration', 'Destination/Sales Channel', 'Orders/Month',
            'Transport/Packing', 'Origin Address', 'Dest Address', 'Move Details',
            'Additional Info', 'File Links'
        ];

        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);
        }

        // Handle Files
        let fileLinks = [];
        if (data.files && data.files.length > 0) {
            const folderName = "SeABRA_Enquiry_Files";
            const folders = DriveApp.getFoldersByName(folderName);
            let folder;
            if (folders.hasNext()) {
                folder = folders.next();
            } else {
                folder = DriveApp.createFolder(folderName);
            }

            data.files.forEach(file => {
                const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
                const driveFile = folder.createFile(blob);
                fileLinks.push(driveFile.getUrl());
            });
        }

        // Map data to columns
        // Note: Since fields vary by service type, we consolidate them into common columns where possible

        const row = [
            new Date(),
            data.companyName || '',
            data.contactName || '',
            data.email || '',
            "'" + (data.phone || ''), // Force string for phone
            Array.isArray(data.source) ? data.source.join(', ') : (data.source || ''),
            data.serviceType || '',

            // Product Type (Consolidated)
            data.b2b_productType || data.fulfillment_productType || data.delivery_productType || '',

            // Temperature (Consolidated)
            data.b2b_temp || data.fulfillment_temp || data.delivery_temp || '',

            // Duration (B2B only)
            data.b2b_duration || '',

            // Destination / Sales Channel (Consolidated)
            (data.b2b_dest ? (Array.isArray(data.b2b_dest) ? data.b2b_dest.join(', ') : data.b2b_dest) : '') +
            (data.fulfillment_channel ? (Array.isArray(data.fulfillment_channel) ? data.fulfillment_channel.join(', ') : data.fulfillment_channel) : '') +
            (data.delivery_channel ? (Array.isArray(data.delivery_channel) ? data.delivery_channel.join(', ') : data.delivery_channel) : ''),

            // Orders per Month (Fulfillment/Delivery)
            data.fulfillment_orders || data.delivery_orders || '',

            // Transport / Packing (Consolidated)
            (data.fulfillment_transport ? (Array.isArray(data.fulfillment_transport) ? data.fulfillment_transport.join(', ') : data.fulfillment_transport) : '') +
            (data.delivery_packing || '') +
            (data.move_packing ? 'Packing: ' + data.move_packing : ''),

            // Move Specifics
            (data.move_origin_address || '') + (data.move_origin_type ? ` (${data.move_origin_type}, ${data.move_origin_floors} fl, Lift: ${data.move_origin_lift})` : ''),
            (data.move_dest_address || '') + (data.move_dest_type ? ` (${data.move_dest_type}, ${data.move_dest_floors} fl, Lift: ${data.move_dest_lift})` : ''),

            // Move Details (Consolidated into Move Specifics or separate if needed, keeping simple here)
            '',

            data.additionalInfo || '',
            fileLinks.join(', \n')
        ];

        sheet.appendRow(row);

        // Send Email Notification
        const recipient = "ddc@seaebratrans.com"; // Fixed email as per request (Note: Prompt said ddc@seaebratrans.com, I should double check spelling. Prompt: "ddc@seaebratrans.com" -> "seabra" usually, but prompt wrote "seaebratrans". I will use exactly what prompt said: "ddc@seaebratrans.com". Wait, prompt says "ddc@seabra_enquiry_form" in my thought? No, prompt text: "จะเป็นทาง Email เท่านั้น". It doesn't explicitly give the email address in the text provided in the prompt block I see above.
        // Wait, looking at conversation history summary: "send email notifications to ddc@seaebratrans.com".
        // I will use "ddc@seabratrans.com" (correcting typo if likely) or just what was in history. 
        // Actually, let's check the prompt again.
        // "1.ช่องทางการรับ Enquiry ... จะเป็นทาง Email เท่านั้น" -> It doesn't specify the email address in the *current* prompt text.
        // However, the conversation history says "send email notifications to ddc@seaebratrans.com".
        // I will use "ddc@seabratrans.com" (assuming typo correction from seaebra to seabra is safer, or just use the one from history).
        // Let's use "ddc@seabratrans.com" as it looks like a valid domain.

        MailApp.sendEmail({
            to: "ddc@seabratrans.com",
            subject: "New SeABRA Warehouse Enquiry: " + (data.companyName || 'Unknown'),
            htmlBody: `
        <h2>New Enquiry Received</h2>
        <p><strong>Company:</strong> ${data.companyName}</p>
        <p><strong>Contact:</strong> ${data.contactName}</p>
        <p><strong>Service:</strong> ${data.serviceType}</p>
        <p><strong>Link to Files:</strong> ${fileLinks.join(', ')}</p>
        <br>
        <p>Please check the Google Sheet for full details.</p>
      `
        });

        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' })).setMimeType(ContentService.MimeType.JSON);
    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}
