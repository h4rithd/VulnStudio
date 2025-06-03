
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

class ChartService {
  constructor() {
    this.width = 400;
    this.height = 300;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: this.width, 
      height: this.height,
      backgroundColour: 'white'
    });
  }

  async generateRiskProfileChart(stats) {
    try {
      const configuration = {
        type: 'doughnut',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
          datasets: [{
            data: [stats.critical, stats.high, stats.medium, stats.low, stats.info],
            backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#17a2b8'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { size: 12 }
              }
            },
            title: {
              display: true,
              text: 'Risk Profile Distribution',
              font: { size: 16, weight: 'bold' }
            }
          }
        }
      };

      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      console.log('Risk profile chart generated, base64 length:', base64Image.length);
      return base64Image;
    } catch (error) {
      console.error('Error generating risk profile chart:', error);
      return null;
    }
  }

  async generateStatusChart(stats) {
    try {
      const configuration = {
        type: 'bar',
        data: {
          labels: ['Total', 'Open', 'Closed'],
          datasets: [{
            label: 'Vulnerabilities',
            data: [stats.total, stats.open, stats.closed],
            backgroundColor: ['#6c757d', '#dc3545', '#28a745'],
            borderColor: ['#495057', '#b02a37', '#1e7e34'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Vulnerability Status',
              font: { size: 16, weight: 'bold' }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      };

      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      console.log('Status chart generated, base64 length:', base64Image.length);
      return base64Image;
    } catch (error) {
      console.error('Error generating status chart:', error);
      return null;
    }
  }

  async generateCVSSChart(cvssScore, severity) {
    try {
      const configuration = {
        type: 'doughnut',
        data: {
          labels: ['Score', 'Remaining'],
          datasets: [{
            data: [cvssScore, 10 - cvssScore],
            backgroundColor: [this.getSeverityColor(severity), '#e9ecef'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: false,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      };

      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      console.log('CVSS chart generated for score:', cvssScore);
      return base64Image;
    } catch (error) {
      console.error('Error generating CVSS chart:', error);
      return null;
    }
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
}

module.exports = new ChartService();
