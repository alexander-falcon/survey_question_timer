odoo.define('survey_question_timer.survey_timer', function (require) {
    "use strict";

    var publicWidget = require('web.public.widget');
    
    var timerInterval = null;
    var currentQuestionId = null;
    var observer = null;
    var isFinished = false;
    var isTimeout = false;

    function resetTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        currentQuestionId = null;
        isTimeout = false;
    }

    function ensureAnswerSelected() {
        var $questionWrapper = $('.js_question-wrapper').first();
        if (!$questionWrapper.length) return;
        
        var $formChoice = $questionWrapper.find('.o_survey_form_choice');
        if ($formChoice.length) {
            var questionType = $formChoice.data('question-type') || $formChoice.attr('data-question-type');
            
            if (questionType === 'simple_choice_radio') {
                var $checked = $formChoice.find('input[type="radio"]:checked');
                if ($checked.length) {
                    $formChoice.find('.o_survey_selected').removeClass('o_survey_selected');
                    $checked.closest('label').addClass('o_survey_selected');
                }
            }
            
            if (questionType === 'multiple_choice') {
                var $checked = $formChoice.find('input[type="checkbox"]:checked');
                if ($checked.length) {
                    $formChoice.find('.o_survey_selected').removeClass('o_survey_selected');
                    $checked.each(function() {
                        $(this).closest('label').addClass('o_survey_selected');
                    });
                }
            }
        }
    }

    function submitForm() {
        if (isFinished) {
            return;
        }
        
        ensureAnswerSelected();
        
        var $submitBtn = $('.o_survey_page_per_question button[type="submit"]');
        if (!$submitBtn.length) {
            $submitBtn = $('.o_survey_navigation_submit');
        }
        if (!$submitBtn.length) {
            $submitBtn = $('form[data-answer-token] button[type="submit"]');
        }
        
        if ($submitBtn.length) {
            resetTimer();
            $submitBtn.click();
        }
    }

    function startTimer() {
        if (isFinished) {
            return;
        }
        
        if (isTimeout) {
            return;
        }
        
        var $questionIdInput = $('input[name="question_id"]');
        if (!$questionIdInput.length) {
            if ($('.o_survey_finished').length || $('.o_survey_fill_form_done').length) {
                isFinished = true;
                resetTimer();
                if (observer) {
                    observer.disconnect();
                }
            }
            return;
        }
        
        var $input = $('input[name="survey_question_time_limit"]');
        if (!$input.length) {
            return;
        }
        
        var newQuestionId = $questionIdInput.val();
        
        if (isTimeout && newQuestionId === currentQuestionId) {
            return;
        }
        
        if (newQuestionId !== currentQuestionId) {
            isTimeout = false;
        }
        
        if (newQuestionId && newQuestionId === currentQuestionId && timerInterval) {
            return;
        }
        
        resetTimer();
        
        var timeLimit = parseInt($input.val(), 10);
        if (isNaN(timeLimit) || timeLimit <= 0) {
            currentQuestionId = newQuestionId;
            return;
        }
        
        // Calcular tiempo restante usando elapsed del servidor (más fiable)
        var $elapsedInput = $('input[name="survey_question_elapsed"]');
        var remaining;
        if ($elapsedInput.length && $elapsedInput.val() !== '') {
            var serverElapsed = parseInt($elapsedInput.val(), 10);
            remaining = Math.max(0, timeLimit - serverElapsed);
        } else {
            remaining = timeLimit;
        }
        
        var $timerContainer = $input.closest('.js_question-wrapper').find('.o_survey_timer_container');
        if (!$timerContainer.length) {
            $timerContainer = $('.o_survey_timer_container').last();
        }
        if (!$timerContainer.length) return;
        
        currentQuestionId = newQuestionId;
        var $timerValue = $timerContainer.find('.o_survey_timer_value');
        var $timerLabel = $timerContainer.find('.o_survey_timer_label');
        var $timerIcon = $timerContainer.find('.fa-clock-o, .fa-exclamation-triangle');

        // Si ya no queda tiempo, mostrar expirado y enviar
        if (remaining <= 0) {
            $timerContainer.removeClass('alert-info').addClass('alert-danger');
            if ($timerIcon.length) {
                $timerIcon.removeClass('fa-clock-o').addClass('fa-exclamation-triangle');
            }
            isTimeout = true;
            setTimeout(function () {
                if (!isFinished) {
                    submitForm();
                }
            }, 500);
            return;
        }
        
        $timerContainer.removeClass('alert-danger').addClass('alert-info');
        if ($timerIcon.length) {
            $timerIcon.removeClass('fa-exclamation-triangle').addClass('fa-clock-o');
        }
        
        function updateDisplay() {
            var minutes = Math.floor(remaining / 60);
            var seconds = remaining % 60;
            $timerValue.text(
                String(minutes).padStart(2, '0') + ':' +
                String(seconds).padStart(2, '0')
            );
        }
        
        function checkTimeout() {
            if (remaining <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                isTimeout = true;
                
                $timerContainer.removeClass('alert-info').addClass('alert-danger');
                if ($timerIcon.length) {
                    $timerIcon.removeClass('fa-clock-o').addClass('fa-exclamation-triangle');
                }
                
                setTimeout(function () {
                    if (!isFinished) {
                        submitForm();
                    }
                }, 1000);
            }
        }
        
        updateDisplay();
        checkTimeout();
        
        timerInterval = setInterval(function () {
            if (remaining > 0) {
                remaining--;
                updateDisplay();
                
                if (remaining <= 5) {
                    $timerContainer.removeClass('alert-info').addClass('alert-danger');
                }
                
                checkTimeout();
            }
        }, 1000);
    }

    var SurveyTimer = publicWidget.Widget.extend({
        selector: '.o_survey_form_content',
        
        start: function () {
            this._super.apply(this, arguments);
            setTimeout(startTimer, 300);
        },
        
        destroy: function () {
            resetTimer();
            this._super.apply(this, arguments);
        }
    });

    $(document).ready(function () {
        setTimeout(startTimer, 500);
        
        observer = new MutationObserver(function (mutations) {
            if (isFinished) {
                return;
            }
            
            if ($('.o_survey_finished').length || $('.o_survey_fill_form_done').length) {
                isFinished = true;
                resetTimer();
                observer.disconnect();
                return;
            }
            
            var shouldCheck = false;
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type === 'childList') {
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        if (node.nodeType === 1) {
                            var $node = $(node);
                            if ($node.find('input[name="question_id"]').length || 
                                $node.is('input[name="question_id"]')) {
                                shouldCheck = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldCheck) break;
            }
            
            if (shouldCheck || $('input[name="survey_question_time_limit"]').length) {
                setTimeout(startTimer, 200);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });

    publicWidget.registry.SurveyQuestionTimer = SurveyTimer;
    return SurveyTimer;
});