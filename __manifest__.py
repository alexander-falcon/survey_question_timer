# -*- coding: utf-8 -*-

{
    'name': "Survey Question Time Limit",
    'version': '16.0.1.0.0',
    'category': 'Marketing/Surveys',
    'summary': 'Add time limit per question in surveys',
    'description': """
        This module allows setting individual time limits for each question in a survey.
        
        Features:
        - Set time limit in seconds per question
        - Visual countdown timer for users
        - Automatic submission when time expires
        - Zero points for expired questions
        - Backend validation to prevent cheating
        
        Requirements:
        - Survey pagination must be set to 'One page per question'
        - 'Allow roaming' must be disabled
        - Global survey time limit must be disabled
""",
    'depends': ['survey'],
    'data': [
        'security/ir.model.access.csv',
        'views/survey_views.xml',
        'views/survey_question_views.xml',
        'views/survey_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'survey_question_timer/static/src/css/survey_timer.css',
            'survey_question_timer/static/src/js/survey_timer.js',
        ],
    },
    'demo': [],
    'installable': True,
    'application': False,
    'auto_install': False,
    'author': "Alexander Falcon",
    # 'website': "http://www.yourcompany.com",
    'license': 'LGPL-3',
}
