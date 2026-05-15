# -*- coding: utf-8 -*-

from odoo import fields, models, api
from odoo.exceptions import ValidationError
from odoo.tools.translate import _

class SurveyQuestion(models.Model):
    _inherit = 'survey.question'

    time_limit = fields.Integer(
        string="Time Limit (seconds)",
        default=10,
        help="""Set a time limit in seconds for this question.
        - 0 means no time limit
        - Default: 10 seconds
        - Minimum: 3 seconds
        - Maximum: 120 seconds (2 minutes)
        - Only works when survey has: 'One page per question', 'Allow roaming' disabled, and no global time limit
        - Mandatory questions cannot have a time limit"""
    )
    
    @api.onchange('time_limit', 'constr_mandatory')
    def _onchange_check_time_limit(self):
        """Immediate validations for time_limit field"""

        if self.time_limit < 0:
            self.time_limit = 0
            return {
                'warning': {
                    'title': _('Invalid Value'),
                    'message': _('Time limit cannot be negative. It has been set to 0 (no limit).')
                }
            }
        
        if 0 < self.time_limit < 3:
            self.time_limit = 3
            return {
                'warning': {
                    'title': _('Minimum Limit'),
                    'message': _('The minimum time limit is 3 seconds. It has been set to 3 seconds.')
                }
            }
        
        if self.time_limit > 120:
            self.time_limit = 120
            return {
                'warning': {
                    'title': _('Maximum Limit'),
                    'message': _('The maximum time limit is 120 seconds (2 minutes). It has been adjusted to 120.')
                }
            }
        
        if self.time_limit > 0 and self.constr_mandatory:
            self.time_limit = 0
            return {
                'warning': {
                    'title': _('Invalid Configuration'),
                    'message': _('Questions with a time limit cannot be mandatory. The time limit has been removed.')
                }
            }
    
    @api.constrains('time_limit')
    def _check_time_limit_validations(self):
        """Validate time_limit: non-negative, minimum 3 if greater than 0"""
        for question in self:
            if question.time_limit < 0:
                raise ValidationError(_(
                    "Time limit cannot be negative.\n"
                    "Question: '%(question_title)s'",
                    question_title=question.title
                ))
            
            if 0 < question.time_limit < 3:
                raise ValidationError(_(
                    "The minimum time limit is 3 seconds.\n"
                    "Question: '%(question_title)s'\n"
                    "Please set 0 (no limit) or at least 3 seconds.",
                    question_title=question.title
                ))
            if question.time_limit > 120:
                raise ValidationError(_(
                    "The maximum time limit is 120 seconds (2 minutes).\n"
                    "Question: '%(question_title)s'\n"
                    "Please set a value between 3 and 120 seconds.",
                    question_title=question.title
                ))
                
    @api.constrains('time_limit', 'constr_mandatory')
    def _check_time_limit_mandatory_compatibility(self):
        """Validate that mandatory questions cannot have a time limit"""
        for question in self:
            if question.time_limit > 0 and question.constr_mandatory:
                raise ValidationError(_(
                    "Questions with a time limit cannot be mandatory.\n"
                    "Question: '%(question_title)s'\n"
                    "Please remove the time limit or uncheck 'Mandatory answer'.",
                    question_title=question.title
                ))
            
    @api.model_create_multi
    def create(self, vals_list):
        """Override create to trigger survey validation"""
        records = super().create(vals_list)
        for record in records:
            if record.survey_id and record.survey_id.use_question_time_limit:
                record.survey_id._check_time_limit_compatibility()
        return records

    def write(self, vals):
        """Override write to trigger survey validation when time_limit changes"""
        affected_surveys = self.mapped('survey_id')
        
        is_relevant_change = 'time_limit' in vals or 'constr_mandatory' in vals
        
        result = super().write(vals)
        
        if is_relevant_change:
            self.env.cr.flush()
            
            for survey in affected_surveys:
                if survey.use_question_time_limit and hasattr(survey, '_check_time_limit_compatibility'):
                    survey._check_time_limit_compatibility()
            
            for question in self:
                question._check_time_limit_validations()
                question._check_time_limit_mandatory_compatibility()
        
        return result