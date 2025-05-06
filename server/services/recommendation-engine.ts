import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import { InsertWorkflowRecommendation, UserWorkflowActivity, WorkflowTemplate } from '@shared/schema';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface UserProfile {
  recentActivities: UserWorkflowActivity[];
  frequentCategories?: string[];
  frequentTemplates?: number[];
  frequentWorkflows?: number[];
  totalWorkflows?: number;
  totalExecutions?: number;
}

export interface RecommendationInput {
  userId: number;
  orgId?: number;
  templates: WorkflowTemplate[];
  userProfile: UserProfile;
}

export interface RecommendationResult {
  recommendations: InsertWorkflowRecommendation[];
}

export class RecommendationEngine {
  /**
   * Generate personalized workflow recommendations for a user
   */
  async generatePersonalRecommendations(input: RecommendationInput): Promise<RecommendationResult> {
    try {
      const { userId, orgId, templates, userProfile } = input;

      // Prepare the prompt data
      const recentActivitiesStr = JSON.stringify(userProfile.recentActivities, null, 2);
      const frequentCategoriesStr = userProfile.frequentCategories ? JSON.stringify(userProfile.frequentCategories) : "[]";
      const frequentTemplatesStr = userProfile.frequentTemplates ? JSON.stringify(userProfile.frequentTemplates) : "[]";
      const templatesStr = JSON.stringify(templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description || "",
      })), null, 2);
      
      // Create the system prompt
      const systemPrompt = `You are a workflow recommendation engine for SynthralOS, an AI workflow automation platform. 
Based on a user's activity and preferences, you'll suggest workflow templates that would be valuable to them.
Analyze the user's activity patterns and generate personalized recommendations.`;

      // Format the user prompt with all relevant data
      const userPrompt = `
I need personalized workflow recommendations for a user based on their activity profile:

# User Profile
- Recent activities: ${recentActivitiesStr}
- Frequent workflow categories: ${frequentCategoriesStr}
- Frequent templates used: ${frequentTemplatesStr}
- Total workflows created: ${userProfile.totalWorkflows || 0}
- Total executions run: ${userProfile.totalExecutions || 0}

# Available Templates
${templatesStr}

Generate 3-5 personalized workflow recommendations for this user. Each recommendation should include:
1. A title (short and descriptive)
2. A detailed reason why this would be valuable to the user based on their activity
3. A brief description of what the workflow will help them accomplish
4. A list of template IDs that would be useful for this workflow
5. A list of categories this workflow falls under
6. A recommendation score (0-100) based on how strongly you think this matches their needs

Format your response as a JSON array where each recommendation has these properties:
\`\`\`json
[
  {
    "title": "string",
    "reason": "string",
    "description": "string",
    "templates": [number],
    "categories": [string],
    "score": number
  }
]
\`\`\``;

      // Call Anthropic API
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      // Extract JSON from the response
      const contentBlock = response.content[0];
      const content = typeof contentBlock === 'object' && 'text' in contentBlock 
        ? contentBlock.text 
        : JSON.stringify(contentBlock);
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON recommendations from AI response');
      }
      
      const recommendationsJson = jsonMatch[1];
      const recommendationsData = JSON.parse(recommendationsJson);
      
      // Map the data to our schema format
      const recommendations: InsertWorkflowRecommendation[] = recommendationsData.map((rec: any) => ({
        userId,
        orgId: orgId || null,
        recommendationType: 'personal',
        title: rec.title,
        description: rec.description,
        reason: rec.reason,
        score: rec.score,
        templates: rec.templates,
        workflowIds: [],
        categories: rec.categories,
        generated: true,
        read: false,
        clicked: false,
      }));
      
      return { recommendations };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate organization-level workflow recommendations
   */
  async generateOrganizationRecommendations(input: RecommendationInput): Promise<RecommendationResult> {
    // Similar to personal recommendations but with org-specific context
    const { recommendations } = await this.generatePersonalRecommendations(input);
    
    // Convert to org recommendations
    const orgRecommendations = recommendations.map(rec => ({
      ...rec,
      recommendationType: 'organization',
    }));
    
    return { recommendations: orgRecommendations };
  }

  /**
   * Save generated recommendations to the database
   */
  async saveRecommendations(recommendations: InsertWorkflowRecommendation[]): Promise<void> {
    for (const recommendation of recommendations) {
      await storage.createWorkflowRecommendation(recommendation);
    }
  }

  /**
   * Build a user profile from their activity data
   */
  async buildUserProfile(userId: number): Promise<UserProfile> {
    // Get user's recent activities
    const recentActivities = await storage.getUserWorkflowActivities(userId);
    
    // Extract frequent categories and templates
    const categoryCount: Record<string, number> = {};
    const templateCount: Record<number, number> = {};
    const workflowCount: Record<number, number> = {};
    
    recentActivities.forEach(activity => {
      // Process workflow and template ids
      if (activity.workflowId) {
        workflowCount[activity.workflowId] = (workflowCount[activity.workflowId] || 0) + 1;
      }
      
      if (activity.templateId) {
        templateCount[activity.templateId] = (templateCount[activity.templateId] || 0) + 1;
      }
      
      // Process workflow categories (from metadata if available)
      const metadata = activity.metadata as any;
      if (metadata && metadata.categories && Array.isArray(metadata.categories)) {
        metadata.categories.forEach((category: string) => {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
      }
    });
    
    // Sort by frequency
    const frequentCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
    
    const frequentTemplates = Object.entries(templateCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([template]) => parseInt(template));
    
    const frequentWorkflows = Object.entries(workflowCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([workflow]) => parseInt(workflow));
    
    // Count totals
    const totalWorkflows = await storage.getWorkflowsByUser(userId).then(workflows => workflows.length);
    
    // Build and return the user profile
    return {
      recentActivities,
      frequentCategories,
      frequentTemplates,
      frequentWorkflows,
      totalWorkflows,
      totalExecutions: recentActivities.filter(a => a.activityType === 'execute').length,
    };
  }

  /**
   * Main method to generate and save recommendations for a user
   */
  async generateAndSaveRecommendationsForUser(userId: number, orgId?: number): Promise<InsertWorkflowRecommendation[]> {
    try {
      // Build user profile
      const userProfile = await this.buildUserProfile(userId);
      
      // Get templates
      const templates = await storage.getAllWorkflowTemplates();
      
      // Generate personal recommendations
      const { recommendations } = await this.generatePersonalRecommendations({
        userId,
        orgId,
        templates,
        userProfile,
      });
      
      // Save recommendations
      await this.saveRecommendations(recommendations);
      
      return recommendations;
    } catch (error) {
      console.error('Error in recommendation generation process:', error);
      throw error;
    }
  }
}

export const recommendationEngine = new RecommendationEngine();