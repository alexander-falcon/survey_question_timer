# -*- coding: utf-8 -*-

from odoo import fields, models, api
from odoo.exceptions import ValidationError
from odoo.tools.translate import _

class SurveySurvey(models.Model):
    _inherit = 'survey.survey'

    use_question_time_limit = fields.Boolean(
        string="Use Question Time Limit",
        default=False,
        help="""Enable individual timer for each question.
        - Only works with pagination: 'One page per question'
        - Requires 'Allow roaming' to be disabled
        - Global time limit must be disabled
        - Each question must have a time greater than 0"""
    )
    
    @api.constrains('questions_layout', 'users_can_go_back', 'is_time_limited', 'use_question_time_limit')
    def _check_time_limit_compatibility(self):
        """Validate survey configuration when use_question_time_limit is enabled"""
        for survey in self:
            # Only validate if the user enabled the feature
            if not survey.use_question_time_limit:
                continue
            
            # Enforce correct survey configuration
            if survey.questions_layout != 'page_per_question':
                raise ValidationError(_(
                    "To use question time limits, pagination must be set to 'One page per question'.\n"
                    "Please change the 'Pagination' setting in the survey configuration."
                ))
            
            if survey.users_can_go_back:
                raise ValidationError(_(
                    "To use question time limits, users cannot go back to previous questions.\n"
                    "Please disable the 'Allow roaming' option in the survey configuration."
                ))
            
            if survey.is_time_limited:
                raise ValidationError(_(
                    "To use question time limits, the global survey time limit must be disabled.\n"
                    "Please uncheck 'Time limit' in the survey configuration."
                ))
            
            # Verify that ALL questions (except sections) have time_limit > 0
            self.env.cr.execute("""
                SELECT COUNT(*) = 0
                FROM survey_question 
                WHERE survey_id = %s 
                AND is_page = FALSE
                AND (time_limit IS NULL OR time_limit <= 0)
            """, [survey.id])
            all_questions_have_time = self.env.cr.fetchone()[0]
            
            if not all_questions_have_time:
                raise ValidationError(_(
                    "To use question time limits, ALL questions must have "
                    "a time greater than 0 configured.\n"
                    "Please review the questions and assign a time to each one."
                ))