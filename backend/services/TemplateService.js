const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const ChartService = require('./ChartService');

class TemplateService {
  constructor() {
    this.templates = {};
    this.registerHelpers();
  }

  registerHelpers() {
    // Register Handlebars helpers
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('gt', (a, b) => a > b);
    Handlebars.registerHelper('lt', (a, b) => a < b);
    Handlebars.registerHelper('add', (a, b) => a + b);
    Handlebars.registerHelper('subtract', (a, b) => a - b);
    Handlebars.registerHelper('multiply', (a, b) => a * b);
    Handlebars.registerHelper('divide', (a, b) => b !== 0 ? a / b : 0);
    Handlebars.registerHelper('percentage', (part, total) => total > 0 ? Math.round((part / total) * 100) : 0);
    
    Handlebars.registerHelper('severityColor', (severity) => {
      const colors = {
        'critical': '#dc3545',
        'high': '#fd7e14',
        'medium': '#ffc107',
        'low': '#28a745',
        'info': '#17a2b8'
      };
      return colors[severity.toLowerCase()] || '#6c757d';
    });

    Handlebars.registerHelper('formatDate', (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    });

    Handlebars.registerHelper('json', (context) => JSON.stringify(context));
    
    Handlebars.registerHelper('range', (start, end) => {
      const result = [];
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
      return result;
    });

    // Add page number calculation helper
    Handlebars.registerHelper('calculatePageNumber', (index, basePages) => {
      return basePages + index;
    });

    // Add figure counter helper
    Handlebars.registerHelper('figureCounter', function() {
      if (!this.figureCount) this.figureCount = 0;
      return ++this.figureCount;
    });
  }

  getSeverityColor(severity) {
    const colors = {
      'critical': '#dc3545',
      'high': '#fd7e14',
      'medium': '#ffc107',
      'low': '#28a745',
      'info': '#17a2b8'
    };
    return colors[severity.toLowerCase()] || '#6c757d';
  }

  async loadTemplate(templateName) {
    if (!this.templates[templateName]) {
      const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      this.templates[templateName] = Handlebars.compile(templateContent);
    }
    return this.templates[templateName];
  }

  async generateReportHtml(data) {
    // Generate charts as base64 images
    data.charts = {
      riskProfile: await ChartService.generateRiskProfileChart(data.stats),
      status: await ChartService.generateStatusChart(data.stats)
    };

    // Generate CVSS charts for each vulnerability
    for (let vuln of data.vulnerabilities) {
      if (vuln.cvss_score) {
        vuln.cvssChart = await ChartService.generateCVSSChart(vuln.cvss_score, vuln.severity);
      }
    }

    // Calculate page numbers
    data.pageNumbers = this.calculatePageNumbers(data);

    const mainTemplate = await this.loadTemplate('main-report');
    return mainTemplate(data);
  }

  calculatePageNumbers(data) {
    let currentPage = 1;
    const pages = {
      cover: currentPage++,
      disclaimer: currentPage++,
      documentControl: currentPage++,
      toc: currentPage++,
      executiveSummary: currentPage++,
      vulnerabilitySpotlight: currentPage++,
      detailedFindings: currentPage
    };

    // Each vulnerability gets its own page
    data.vulnerabilities.forEach((vuln, index) => {
      vuln.pageNumber = currentPage++;
    });

    pages.conclusion = currentPage;
    return pages;
  }

  generateChartConfig(data) {
    return {
      riskProfile: {
        type: 'doughnut',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
          datasets: [{
            data: [
              data.stats.critical,
              data.stats.high,
              data.stats.medium,
              data.stats.low,
              data.stats.info
            ],
            backgroundColor: [
              '#dc3545',
              '#fd7e14',
              '#ffc107',
              '#28a745',
              '#17a2b8'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      },
      vulnerabilityStatus: {
        type: 'bar',
        data: {
          labels: ['Total', 'Open', 'Closed'],
          datasets: [{
            label: 'Vulnerabilities',
            data: [data.stats.total, data.stats.open, data.stats.closed],
            backgroundColor: ['#6c757d', '#dc3545', '#28a745'],
            borderColor: ['#495057', '#b02a37', '#1e7e34'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      }
    };
  }
}

module.exports = new TemplateService();
