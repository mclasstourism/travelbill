const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50 });
const outputPath = path.join(__dirname, '..', 'public', 'terms-of-service.pdf');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

doc.pipe(fs.createWriteStream(outputPath));

doc.fontSize(20).font('Helvetica-Bold').text('MIDDLE CLASS TOURISM', { align: 'center' });
doc.fontSize(16).text('Terms of Service', { align: 'center' });
doc.moveDown();
doc.fontSize(10).font('Helvetica').text(`Effective Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
doc.moveDown(2);

const sections = [
  {
    title: '1. ACCEPTANCE OF TERMS',
    content: `By accessing and using the Middle Class Tourism Billing Application ("TravelBill"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use this application.`
  },
  {
    title: '2. DESCRIPTION OF SERVICE',
    content: `TravelBill is a comprehensive billing application designed for travel agencies. The application provides:
    
• Invoice management and creation
• Ticket issuance and tracking
• Customer and agent management
• Vendor credit and deposit tracking
• Payment processing (cash, card, credit)
• PIN-based authentication for bill creators
• Staff login with secure password management
• Financial reporting and analytics

All monetary transactions are displayed in UAE Dirhams (AED).`
  },
  {
    title: '3. USER ACCOUNTS AND SECURITY',
    content: `• Users are responsible for maintaining the confidentiality of their login credentials
• Staff accounts require username and password authentication
• Bill creators must authenticate using an 8-digit PIN before creating invoices or issuing tickets
• Users must immediately notify the administrator of any unauthorized use of their account
• Sessions automatically expire after 30 minutes of inactivity for security purposes`
  },
  {
    title: '4. USER RESPONSIBILITIES',
    content: `Users agree to:
• Provide accurate and complete information when creating records
• Use the application only for lawful business purposes
• Not share login credentials with unauthorized individuals
• Report any system errors or security concerns promptly
• Maintain accurate customer, agent, and vendor records
• Ensure all financial transactions are properly documented`
  },
  {
    title: '5. DATA AND PRIVACY',
    content: `• All data entered into the system is stored securely
• Customer information is used solely for billing and business purposes
• We implement industry-standard security measures to protect sensitive data
• Passwords are encrypted using bcrypt hashing
• Users should not enter sensitive personal data beyond what is necessary for billing`
  },
  {
    title: '6. FINANCIAL TRANSACTIONS',
    content: `• All invoices and tickets must be reviewed for accuracy before finalization
• Deposit transactions are tracked and recorded in the system
• Credit transactions with vendors are monitored and reported
• Payment methods include cash, card, and credit options
• Discounts applied to invoices are recorded for audit purposes`
  },
  {
    title: '7. LIMITATION OF LIABILITY',
    content: `• The application is provided "as is" without warranties of any kind
• Middle Class Tourism is not liable for any indirect, incidental, or consequential damages
• Users are responsible for verifying the accuracy of all generated documents
• The company is not responsible for data loss due to user error or unauthorized access`
  },
  {
    title: '8. MODIFICATIONS TO SERVICE',
    content: `• We reserve the right to modify or discontinue the service at any time
• Users will be notified of significant changes to the application
• Continued use after modifications constitutes acceptance of changes`
  },
  {
    title: '9. TERMINATION',
    content: `• Access to the application may be terminated for violation of these terms
• Upon termination, users lose access to the system and its data
• The company may terminate service with or without cause upon notice`
  },
  {
    title: '10. GOVERNING LAW',
    content: `These terms are governed by the laws of the United Arab Emirates. Any disputes arising from the use of this application shall be resolved in the courts of the UAE.`
  },
  {
    title: '11. CONTACT INFORMATION',
    content: `For questions regarding these Terms of Service, please contact:

Middle Class Tourism
United Arab Emirates
Email: support@middleclasstourism.com`
  }
];

sections.forEach((section, index) => {
  if (index > 0 && doc.y > 650) {
    doc.addPage();
  }
  
  doc.fontSize(12).font('Helvetica-Bold').text(section.title);
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(section.content, { align: 'justify', lineGap: 2 });
  doc.moveDown(1.5);
});

doc.moveDown(2);
doc.fontSize(10).font('Helvetica-Oblique').text('By using the TravelBill application, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.', { align: 'center' });

doc.end();

console.log('Terms of Service PDF generated at:', outputPath);
