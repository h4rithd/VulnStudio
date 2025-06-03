
# VulnStudio – Comprehensive Vulnerability Report Generation Tool

VulnStudio is a streamlined web-based vulnerability reporting system tailored for penetration testers. Designed with simplicity and efficiency in mind, it offers a clean, minimalist UI combined with a robust PostgreSQL backend to help you create professional penetration test reports faster and with less hassle.

This open-source project aims to simplify and automate the traditionally tedious process of vulnerability report generation — empowering the security community to collaborate and improve together.

---

## 🚀 Features

- Minimalist, clean, and intuitive user interface  
- Seamless integration with PostgreSQL for reliable data management  
- Customizable report templates (basic templates included)  
- Open-source for community-driven enhancements  
- Initial design concept powered by **Lovable AI** for rapid prototyping  

---

## 💡 Why VulnStudio?

For years, I struggled with manual, time-consuming report creation in Word. Existing tools lacked the professional and minimalist aesthetic I envisioned. VulnStudio is the product of that frustration — a tool built by a penetration tester, for penetration testers. Now, it's open to the community for continuous improvement and growth.

---

## 📋 Installation

```bash
# Clone the repository
git clone https://github.com/h4rithd/VulnStudio
cd VulnStudio

# Install dependencies
cd backend && npm install
cd .. && npm install

# Start the development servers
npm run dev         # Frontend
cd backend && npm run dev  # Backend
```

> **Note:** Replace the Chromium binary path on line 15 in `backend/services/PdfService.js` to your local Chromium executable, e.g.,  
> `/usr/bin/chromium`

---

## 🔐 Default Credentials

| Role    | Email                 | Password        |
|---------|-----------------------|-----------------|
| Admin   | admin@vulnstudio.com  | !I2z]je26vT#    |
| Auditor | auditor@vulnstudio.com| pVlQ314#NL5O    |

---

## ⚙️ Configuration

Set up your PostgreSQL database and configure the environment variables in `/backend/.env`:

```env
PORT=3000
JWT_SECRET=your_jwt_secret_here
PGUSER=your_db_user
PGHOST=127.0.0.1
PGDATABASE=vulnstudiodb
PGPASSWORD=your_db_password
PGPORT=5432
```

### Database Setup

1. Import the database schema:

```bash
psql -U your_db_user -d vulnstudiodb -f data/vulnstudiodb.sql
```

2. Import the sample data `data/vulndb.json` via the VulnDB page inside the application.

---

## 📝 Contributing

I’m relatively new to full-stack development, so some code may be messy or suboptimal. Contributions are highly welcome! Feel free to submit bug fixes, optimizations, or new features — every improvement counts.

---

## 🌐 Live Demo

Try out a live demo at [vulnstudio.com](https://vulnstudio.com). For access credentials, please reach out to me via LinkedIn.

---

## 📬 Feedback & Contact

Your feedback and contributions are invaluable. Let’s build a better tool together!  
Connect with me on LinkedIn or open an issue on GitHub.

---

### Tags

#VulnStudio #PenetrationTesting #Cybersecurity #OpenSource #h4rithd #HarithD
