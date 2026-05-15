# -*- coding: utf-8 -*-

from odoo import fields, models

class SurveyQuestionStartTime(models.Model):
    _name = 'survey.question.start.time'
    _description = 'Question Start Time'
    
    user_input_id = fields.Many2one(
        'survey.user.input',
        string='User Input',
        required=True,
        ondelete='cascade',
        index=True
    )
    question_id = fields.Many2one(
        'survey.question',
        string='Question',
        required=True,
        ondelete='cascade'
    )
    start_time = fields.Datetime(
        string='Start Time',
        required=True,
        default=fields.Datetime.now
    )