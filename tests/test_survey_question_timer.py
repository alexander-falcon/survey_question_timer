# -*- coding: utf-8 -*-
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import ValidationError

@tagged('post_install', 'at_install')
class TestSurveyQuestionTimer(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        
        cls.survey = cls.env['survey.survey'].create({
            'title': 'Test Survey',
            'active': True,
            'questions_layout': 'page_per_question',
            'users_can_go_back': False,
            'is_time_limited': False,
            'use_question_time_limit': True,
        })
        
        cls.question_1 = cls.env['survey.question'].create({
            'title': 'Question 1',
            'survey_id': cls.survey.id,
            'question_type': 'simple_choice',
            'time_limit': 10,
            'is_page': False,
        })
        cls.question_2 = cls.env['survey.question'].create({
            'title': 'Question 2',
            'survey_id': cls.survey.id,
            'question_type': 'simple_choice',
            'time_limit': 10,
            'is_page': False,
        })
        
        cls.answer_1a = cls.env['survey.question.answer'].create({
            'question_id': cls.question_1.id,
            'value': 'Answer A',
        })
        cls.answer_1b = cls.env['survey.question.answer'].create({
            'question_id': cls.question_1.id,
            'value': 'Answer B',
        })

    def test_time_limit_default_value(self):
        """El valor por defecto de time_limit debe ser 10."""
        question = self.env['survey.question'].create({
            'title': 'Default Question',
            'survey_id': self.survey.id,
            'question_type': 'simple_choice',
        })
        self.assertEqual(question.time_limit, 10)

    def test_time_limit_negative_constrains(self):
        """ValidationError si time_limit negativo al guardar."""
        with self.assertRaises(ValidationError):
            self.question_1.write({'time_limit': -5})

    def test_time_limit_below_minimum_constrains(self):
        """ValidationError si time_limit < 3 al guardar."""
        with self.assertRaises(ValidationError):
            self.question_1.write({'time_limit': 2})

    def test_time_limit_above_maximum_constrains(self):
        """ValidationError si time_limit > 120 al guardar."""
        with self.assertRaises(ValidationError):
            self.question_1.write({'time_limit': 150})

    def test_time_limit_mandatory_constrains(self):
        """ValidationError si pregunta obligatoria con time_limit."""
        with self.assertRaises(ValidationError):
            self.question_1.write({'constr_mandatory': True, 'time_limit': 10})

    def test_time_limit_valid_values(self):
        """Valores válidos deben guardarse correctamente."""
        self.question_1.write({'time_limit': 30})
        self.assertEqual(self.question_1.time_limit, 30)
        
        self.question_1.write({'time_limit': 3})
        self.assertEqual(self.question_1.time_limit, 3)
        
        self.question_1.write({'time_limit': 120})
        self.assertEqual(self.question_1.time_limit, 120)

    def test_time_limit_zero_allowed_when_feature_off(self):
        """time_limit=0 se permite si use_question_time_limit=False."""
        self.survey.write({'use_question_time_limit': False})
        self.question_1.write({'time_limit': 0})
        self.assertEqual(self.question_1.time_limit, 0)

    def test_survey_wrong_pagination(self):
        """ValidationError si paginación no es page_per_question."""
        # Crear encuesta con paginación incorrecta y funcionalidad activada
        survey_bad = self.env['survey.survey'].create({
            'title': 'Bad Survey',
            'questions_layout': 'one_page',
            'users_can_go_back': False,
            'is_time_limited': False,
            'use_question_time_limit': False,  # Primero False para poder crear
        })
        # Añadir preguntas con time_limit
        self.env['survey.question'].create({
            'title': 'Q1',
            'survey_id': survey_bad.id,
            'question_type': 'simple_choice',
            'time_limit': 10,
            'is_page': False,
        })
        # Ahora activar la funcionalidad → debe fallar
        with self.assertRaises(ValidationError):
            survey_bad.use_question_time_limit = True

    def test_question_start_time_created(self):
        """Al renderizar una pregunta, se crea registro de start_time."""
        answer = self.survey._create_answer(user=self.env.user, test_entry=True)
        answer._mark_in_progress()
        
        start_record = self.env['survey.question.start.time'].create({
            'user_input_id': answer.id,
            'question_id': self.question_1.id,
            'start_time': '2026-05-14 12:00:00',
        })
        self.assertTrue(start_record.id)
        self.assertEqual(start_record.question_id, self.question_1)

    def test_survey_all_questions_need_time(self):
        """ValidationError si alguna pregunta no tiene time_limit."""
        # Desactivar para crear pregunta sin tiempo
        self.survey.use_question_time_limit = False
        self.env['survey.question'].create({
            'title': 'No Time Question',
            'survey_id': self.survey.id,
            'question_type': 'simple_choice',
            'time_limit': 0,
            'is_page': False,
        })
        # Reactivar → debe fallar
        with self.assertRaises(ValidationError):
            self.survey.use_question_time_limit = True

    def test_section_pages_ignored(self):
        """Las secciones (is_page=True) no requieren time_limit."""
        self.survey.use_question_time_limit = False
        self.env['survey.question'].create({
            'title': 'Section Page',
            'survey_id': self.survey.id,
            'question_type': False,  # Las páginas no tienen tipo
            'time_limit': 0,
            'is_page': True,
        })
        self.survey.use_question_time_limit = True
        self.survey._check_time_limit_compatibility()

    def test_time_limit_zero_with_feature_on(self):
        """time_limit=0 debe fallar si use_question_time_limit=True."""
        with self.assertRaises(ValidationError):
            self.question_1.write({'time_limit': 0})
    