/**
 * Data Exporter
 * Privacy-compliant data export functionality for parent-teacher reports
 * Requirements: 7.3, 7.4, 11.5
 */

import { PrivacyManager, DataExportOptions } from './PrivacyManager.js';
import { ProgressManager } from '../progress/ProgressManager.js';
import { ParentTeacherReportGenerator } from '../progress/ParentTeacherReport.js';

export interface ExportFormat {
  type: 'json' | 'html' | 'csv' | 'txt';
  filename: string;
  mimeType: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  size: number;
  format: string;
  error?: string;
}

export class DataExporter {
  private privacyManager: PrivacyManager;
  private progressManager: ProgressManager;
  private reportGenerator: ParentTeacherReportGenerator;

  constructor() {
    this.privacyManager = PrivacyManager.getInstance();
    this.progressManager = ProgressManager.getInstance();
    this.reportGenerator = new ParentTeacherReportGenerator();
  }

  /**
   * Export educational progress data in various formats
   */
  public async exportEducationalData(
    format: ExportFormat['type'] = 'json',
    options: DataExportOptions = {
      includePersonalData: false,
      includeProgressData: true,
      includeSTEMAnalytics: true,
      includeAchievements: true
    }
  ): Promise<ExportResult> {
    try {
      // Ensure no personal data is included
      options.includePersonalData = false;

      const progress = this.progressManager.getProgress();
      const stemAnalytics = this.progressManager.getSTEMAnalytics();
      const achievements = this.progressManager.getAchievements();

      const exportData = {
        progress,
        stemMetrics: stemAnalytics,
        achievements,
        milestones: this.progressManager.getMilestones(),
        availableGems: this.progressManager.getAvailableGems()
      };

      let content: string;
      let mimeType: string;
      let filename: string;

      switch (format) {
        case 'json':
          content = this.privacyManager.generatePrivacyCompliantExport(exportData, options);
          mimeType = 'application/json';
          filename = `robo-pet-progress-${this.getDateString()}.json`;
          break;

        case 'html':
          content = await this.generateHTMLReport(options);
          mimeType = 'text/html';
          filename = `robo-pet-report-${this.getDateString()}.html`;
          break;

        case 'csv':
          content = this.generateCSVReport(exportData, options);
          mimeType = 'text/csv';
          filename = `robo-pet-data-${this.getDateString()}.csv`;
          break;

        case 'txt':
          content = this.generateTextReport(exportData, options);
          mimeType = 'text/plain';
          filename = `robo-pet-summary-${this.getDateString()}.txt`;
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Download the file
      this.downloadFile(content, filename, mimeType);

      return {
        success: true,
        filename,
        size: content.length,
        format,
      };

    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        filename: '',
        size: 0,
        format,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate HTML report for parent-teacher conferences
   */
  private async generateHTMLReport(options: DataExportOptions): Promise<string> {
    const reportData = this.reportGenerator.generateReport(
      this.progressManager,
      options.dateRange?.startDate,
      options.dateRange?.endDate
    );

    return this.reportGenerator.generatePrintableReport(reportData);
  }

  /**
   * Generate CSV format for data analysis
   */
  private generateCSVReport(data: any, options: DataExportOptions): string {
    const sanitizedData = this.privacyManager.sanitizeData(data);
    const rows: string[] = [];

    // Header
    rows.push('Metric,Value,Date');

    if (options.includeProgressData && sanitizedData.progress) {
      rows.push(`Total Repairs,${sanitizedData.progress.totalRepairs},${sanitizedData.progress.lastModified}`);
      rows.push(`Robo Gems Earned,${sanitizedData.progress.roboGemsEarned},${sanitizedData.progress.lastModified}`);
      rows.push(`Age Group,${sanitizedData.progress.ageGroup},${sanitizedData.progress.createdAt}`);
    }

    if (options.includeSTEMAnalytics && sanitizedData.stemMetrics) {
      rows.push(`Problem Solving Score,${sanitizedData.stemMetrics.problemSolvingScore},${new Date().toISOString()}`);
      rows.push(`Concepts Learned,${sanitizedData.stemMetrics.mechanicalConceptsLearned.length},${new Date().toISOString()}`);
      rows.push(`Unique Customizations,${sanitizedData.stemMetrics.creativityMetrics.uniqueCustomizations},${new Date().toISOString()}`);
      rows.push(`Total Play Time (minutes),${Math.round(sanitizedData.stemMetrics.totalPlayTime / 60000)},${new Date().toISOString()}`);
    }

    if (options.includeAchievements && sanitizedData.achievements) {
      sanitizedData.achievements.forEach((achievement: any) => {
        rows.push(`Achievement: ${achievement.id},Unlocked,${achievement.unlockedAt}`);
      });
    }

    return rows.join('\n');
  }

  /**
   * Generate plain text summary report
   */
  private generateTextReport(data: any, options: DataExportOptions): string {
    const sanitizedData = this.privacyManager.sanitizeData(data);
    const lines: string[] = [];

    lines.push('ROBO-PET REPAIR SHOP - EDUCATIONAL PROGRESS REPORT');
    lines.push('=' .repeat(50));
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Privacy Compliant: Yes (COPPA Safe)`);
    lines.push('');

    if (options.includeProgressData && sanitizedData.progress) {
      lines.push('PROGRESS SUMMARY:');
      lines.push(`• Age Group: ${sanitizedData.progress.ageGroup} years`);
      lines.push(`• Total Repairs Completed: ${sanitizedData.progress.totalRepairs}`);
      lines.push(`• Robo Gems Earned: ${sanitizedData.progress.roboGemsEarned}`);
      lines.push(`• Tools Unlocked: ${sanitizedData.progress.unlockedTools.length}`);
      lines.push(`• Customizations Unlocked: ${sanitizedData.progress.unlockedCustomizations.length}`);
      lines.push('');
    }

    if (options.includeSTEMAnalytics && sanitizedData.stemMetrics) {
      lines.push('STEM LEARNING ANALYTICS:');
      lines.push(`• Problem Solving Score: ${sanitizedData.stemMetrics.problemSolvingScore}%`);
      lines.push(`• Mechanical Concepts Learned: ${sanitizedData.stemMetrics.mechanicalConceptsLearned.length}`);
      lines.push(`  - ${sanitizedData.stemMetrics.mechanicalConceptsLearned.join(', ')}`);
      lines.push(`• Creativity Score: ${this.calculateCreativityScore(sanitizedData.stemMetrics.creativityMetrics)}%`);
      lines.push(`• Total Play Time: ${Math.round(sanitizedData.stemMetrics.totalPlayTime / 60000)} minutes`);
      lines.push(`• Average Diagnostic Time: ${Math.round(sanitizedData.stemMetrics.timeToCompletion.averageDiagnostic / 1000)} seconds`);
      lines.push(`• Average Repair Time: ${Math.round(sanitizedData.stemMetrics.timeToCompletion.averageRepair / 1000)} seconds`);
      lines.push('');
    }

    if (options.includeAchievements && sanitizedData.achievements) {
      lines.push('ACHIEVEMENTS:');
      sanitizedData.achievements.forEach((achievement: any) => {
        const date = new Date(achievement.unlockedAt).toLocaleDateString();
        lines.push(`• ${achievement.id} (${date})`);
      });
      lines.push('');
    }

    lines.push('EDUCATIONAL INSIGHTS:');
    lines.push('This report contains anonymous educational progress data only.');
    lines.push('No personally identifiable information is included.');
    lines.push('Data is generated from local gameplay and stored securely on device.');
    lines.push('');
    lines.push('For questions about this report, please refer to the game\'s');
    lines.push('educational documentation or consult with your child about');
    lines.push('their gameplay experiences.');

    return lines.join('\n');
  }

  /**
   * Calculate overall creativity score
   */
  private calculateCreativityScore(creativityMetrics: any): number {
    const uniquenessScore = Math.min(100, creativityMetrics.uniqueCustomizations * 5);
    const diversityScore = Math.min(100, (creativityMetrics.colorVariationsUsed + creativityMetrics.accessoryCombinations) * 2);
    return Math.round((uniquenessScore + diversityScore) / 2);
  }

  /**
   * Download file to user's device
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log(`File downloaded: ${filename} (${content.length} bytes)`);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw new Error('File download failed');
    }
  }

  /**
   * Get formatted date string for filenames
   */
  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Export data for specific date range
   */
  public async exportDateRangeData(
    startDate: Date,
    endDate: Date,
    format: ExportFormat['type'] = 'json'
  ): Promise<ExportResult> {
    const options: DataExportOptions = {
      includePersonalData: false,
      includeProgressData: true,
      includeSTEMAnalytics: true,
      includeAchievements: true,
      dateRange: { startDate, endDate }
    };

    return this.exportEducationalData(format, options);
  }

  /**
   * Export summary report for quick overview
   */
  public async exportSummaryReport(): Promise<ExportResult> {
    try {
      const summary = this.progressManager.generateSummaryReport();
      const filename = `robo-pet-summary-${this.getDateString()}.txt`;
      
      this.downloadFile(summary, filename, 'text/plain');
      
      return {
        success: true,
        filename,
        size: summary.length,
        format: 'txt'
      };
    } catch (error) {
      return {
        success: false,
        filename: '',
        size: 0,
        format: 'txt',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available export formats
   */
  public getAvailableFormats(): ExportFormat[] {
    return [
      {
        type: 'json',
        filename: 'Educational Data (JSON)',
        mimeType: 'application/json'
      },
      {
        type: 'html',
        filename: 'Parent-Teacher Report (HTML)',
        mimeType: 'text/html'
      },
      {
        type: 'csv',
        filename: 'Data Analysis (CSV)',
        mimeType: 'text/csv'
      },
      {
        type: 'txt',
        filename: 'Summary Report (Text)',
        mimeType: 'text/plain'
      }
    ];
  }

  /**
   * Validate export request for privacy compliance
   */
  public validateExportRequest(options: DataExportOptions): boolean {
    // Always ensure no personal data is included
    if (options.includePersonalData) {
      console.error('Privacy violation: Personal data export requested but not allowed');
      return false;
    }

    // Perform privacy audit before export
    const audit = this.privacyManager.performPrivacyAudit();
    if (!audit.compliant) {
      console.error('Privacy audit failed before export:', audit.issues);
      return false;
    }

    return true;
  }
}