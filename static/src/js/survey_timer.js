// -*- coding: utf-8 -*-

odoo.define('survey_question_timer.survey_timer', function(require) {
    "use strict";
    
    var publicWidget = require('web.public.widget');
    
    // Aquí irá la lógica del temporizador
    var SurveyTimer = publicWidget.Widget.extend({
        selector: '.o_survey_question_timer',
        
        // Métodos vacíos por ahora
    });
    
    publicWidget.registry.SurveyQuestionTimer = SurveyTimer;
    
    return SurveyTimer;
});