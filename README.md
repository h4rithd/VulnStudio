# VulnStudio – Comprehensive Vulnerability Report Generation Tool  

VulnStudio is a web-based vulnerability reporting system designed to streamline the reporting workflow for penetration testers. Built with a focus on simplicity and efficiency, VulnStudio integrates seamlessly with **Supabase**, providing a powerful backend for storing and managing your findings. This project is an open-source effort to simplify the often tedious task of creating professional penetration test reports.  

## 🚀 Features  
- Minimalist, clean UI for efficient report generation  
- Seamless **Supabase** database integration  
- Customizable report templates (basic version included)  
- Open-source for community collaboration and improvement
- Initial design concept generated using **Lovable AI** for fast prototyping

## 💡 Why VulnStudio?  
For years, I struggled with manually creating penetration test reports in Word. Existing tools didn’t quite match my vision for professional, minimalist report design, so I built my own. VulnStudio is the realization of that long-held goal, now available for the community to enhance and evolve.  

## 📋 Installation  
```bash
# Clone the repository
git clone https://github.com/h4rithd/VulnStudio
cd VulnStudio

# Install dependencies
npm install

# Start the development server
npm run dev
```

## ⚙️ Configuration  
Before using the application, you’ll need to set up your Supabase database and replace the API keys in the .env file:  
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
```

### Database Setup  
Import the database structure from **src/sql/db-structure.sql**. The policies for the tables are available in **src/sql/table-policies.sql**.  

## 📝 Contributing  
I have limited full-stack development experience, so you may encounter some messy code or suboptimal logic. I encourage you to contribute by fixing bugs or optimizing the code – every improvement counts!   

## 🌐 Demo  
A live demo is available at **[vulnstudio.com](https://vulnstudio.com)**. Please ping me on LinkedIn for credentials.  

## 📬 Feedback  
Your feedback and contributions are highly appreciated. Let’s build something great together!  


⚠️ **Security Note:** My original code included some hardcoded secrets used during development. This repository has been cleaned to remove all sensitive information. 

#VulnStudio #PenetrationTesting #Cybersecurity #OpenSource #h4rithd #HarithD
