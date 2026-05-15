# -*- coding: utf-8 -*-

from odoo import http, _
from odoo.addons.survey.controllers.main import Survey
from odoo.http import request
from datetime import datetime
import json

class CustomSurvey(Survey):
    
    def _prepare_survey_data(self, survey_sudo, answer_sudo, **post):
        """Extender para añadir time_limit al contexto de la pregunta"""
        data = super()._prepare_survey_data(survey_sudo, answer_sudo, **post)
        
        if answer_sudo.state == 'done':
            request.session.pop('expired_questions', None)
            return data

        if survey_sudo.use_question_time_limit:
            question = data.get('question')
            
            if question and question.time_limit > 0:
                question_id = int(question.id)
                
                start_record = request.env['survey.question.start.time'].sudo().search([
                    ('user_input_id', '=', answer_sudo.id),
                    ('question_id', '=', question_id)
                ], limit=1)
                
                if start_record:
                    start_time = start_record.start_time.isoformat()
                    elapsed = int((datetime.now() - start_record.start_time).total_seconds())
                else:
                    start_time = datetime.now()
                    request.env['survey.question.start.time'].sudo().create({
                        'user_input_id': answer_sudo.id,
                        'question_id': question_id,
                        'start_time': start_time,
                    })
                    start_time = start_time.isoformat()
                    elapsed = 0

                data['question_start_time'] = start_time
                data['question_elapsed'] = elapsed
        
        return data

    @http.route('/survey/submit/<string:survey_token>/<string:answer_token>', type='json', auth='public', website=True)
    def survey_submit(self, survey_token, answer_token, **post):
        """Extender submit para validar tiempo por pregunta"""
        access_data = self._get_access_data(survey_token, answer_token, ensure_token=True)
        if access_data['validity_code'] is not True:
            return {'error': access_data['validity_code']}
        
        survey_sudo, answer_sudo = access_data['survey_sudo'], access_data['answer_sudo']
        
        if survey_sudo.use_question_time_limit and answer_sudo.state == 'in_progress':
            question_id = post.get('question_id')
            
            if question_id:
                question = request.env['survey.question'].sudo().browse(int(question_id))
                
                if question.time_limit > 0:
                    question_id_int = int(question_id)
                    
                    start_record = request.env['survey.question.start.time'].sudo().search([
                        ('user_input_id', '=', answer_sudo.id),
                        ('question_id', '=', question_id_int)
                    ], limit=1)
                    
                    if start_record:
                        start_time = start_record.start_time
                        elapsed = (datetime.now() - start_time).total_seconds()
                        
                        if elapsed > (question.time_limit + 3):
                            post.pop(str(question.id), None)
                            expired = request.session.get('expired_questions', [])
                            if question_id_int not in expired:
                                expired.append(question_id_int)
                                request.session['expired_questions'] = expired
        
        return super().survey_submit(survey_token, answer_token, **post)