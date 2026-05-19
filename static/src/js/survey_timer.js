odoo.define('survey_question_timer.survey_timer', function (require) {
    "use strict";

    var publicWidget = require('web.public.widget');
    
    var timerInterval = null;
    var currentQuestionId = null;
    var observer = null;
    var isFinished = false;
    var isTimeout = false;
    var isFocusMonitoring = false;

    function resetTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        currentQuestionId = null;
        isTimeout = false;
        $('body').removeClass('o_survey_has_timer');
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

        $('body').addClass('o_survey_has_timer');
        
        currentQuestionId = newQuestionId;
        var $timerValue = $timerContainer.find('.o_survey_timer_value');
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

    function addAntiCopyProtection() {
        // Bloquear clic derecho
        $(document).on('contextmenu', '.o_survey_form, .o_survey_question', function(e) {
            e.preventDefault();
            return false;
        });

        // Bloquear selección de texto
        $(document).on('selectstart', '.o_survey_form, .o_survey_question', function(e) {
            e.preventDefault();
            return false;
        });

        // Bloquear Ctrl+C, Ctrl+X, Ctrl+U, F12
        $(document).on('keydown', function(e) {
            // Ctrl+C, Ctrl+X, Ctrl+U
            if ((e.ctrlKey || e.metaKey) && 
                (e.keyCode === 67 || e.keyCode === 88 || e.keyCode === 85)) {
                e.preventDefault();
                return false;
            }
            // F12 (DevTools)
            if (e.keyCode === 123) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I / Cmd+Shift+I (DevTools)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 73) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+J / Cmd+Shift+J (Console)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 74) {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+C / Cmd+Shift+C (Inspect element)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                return false;
            }
        });

        // Bloquear arrastre de elementos
        $(document).on('dragstart', '.o_survey_form, .o_survey_question', function(e) {
            e.preventDefault();
            return false;
        });
    }

    function addDevToolsDetection() {
        var devToolsOpen = false;
        var threshold = 160;
        
        setInterval(function() {
            var widthThreshold = window.outerWidth - window.innerWidth > threshold;
            var heightThreshold = window.outerHeight - window.innerHeight > threshold;
            
            if (widthThreshold || heightThreshold) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    console.clear();
                    console.log('%c⚠️ Advertencia de seguridad', 'color: red; font-size: 30px;');
                    console.log('%cLas herramientas de desarrollador están desactivadas para esta encuesta.', 'font-size: 16px;');
                }
            } else {
                devToolsOpen = false;
            }
        }, 1000);
    }

    function addWatermark() {
        // Obtener datos del usuario desde el DOM de Odoo
        var userName = '';
        var userEmail = '';
        
        // Intentar obtener nombre de usuario (Odoo suele tener estos elementos)
        var $userName = $('.o_user_name, .user-name, .nav-item .o_user_menu .dropdown-toggle');
        if ($userName.length) {
            userName = $userName.first().text().trim();
        }
        
        // Intentar obtener email
        var $userEmail = $('input[name="partner_email"], .partner-email');
        if ($userEmail.length) {
            userEmail = $userEmail.val() || $userEmail.text().trim();
        }
        
        // Si no se encuentra, usar datos genéricos
        if (!userName) {
            userName = 'Usuario';
        }
        
        var now = new Date();
        var dateStr = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES');
        
        // Crear elemento de marca de agua
        var $watermark = $('<div>')
            .attr('id', 'survey-watermark')
            .css({
                'position': 'fixed',
                'top': '0',
                'left': '0',
                'width': '100%',
                'height': '100%',
                'pointer-events': 'none',
                'z-index': '9998',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'opacity': '0.04',
                'font-size': '20px',
                'color': '#000000',
                'font-family': 'Arial, sans-serif',
                'white-space': 'pre-line',
                'text-align': 'center',
                'transform': 'rotate(-25deg)',
                'overflow': 'hidden',
                'user-select': 'none',
                '-webkit-user-select': 'none'
            });
        
        // Construir texto de marca de agua (repetido para cubrir pantalla)
        var watermarkText = userName;
        if (userEmail) {
            watermarkText += ' | ' + userEmail;
        }
        watermarkText += ' | ' + dateStr;
        
        // Repetir el texto para cubrir mejor la pantalla
        var repeatedText = '';
        for (var i = 0; i < 20; i++) {
            repeatedText += watermarkText + '          ';
        }
        
        $watermark.text(repeatedText);
        
        // Eliminar marca anterior si existe
        $('#survey-watermark').remove();
        
        // Agregar al body
        $('body').append($watermark);
    }

    function startBlurProtection() {
        if (isFocusMonitoring) return;
        isFocusMonitoring = true;
        
        // Crear capa de desenfoque (oculta inicialmente)
        var $blurOverlay = $('<div>')
            .attr('id', 'survey-blur-overlay')
            .css({
                'position': 'fixed',
                'top': '0',
                'left': '0',
                'width': '100%',
                'height': '100%',
                'background': 'rgba(0, 0, 0, 0.3)',
                'backdrop-filter': 'blur(20px)',
                '-webkit-backdrop-filter': 'blur(20px)',
                'z-index': '9999',
                'display': 'none',
                'pointer-events': 'none'
            });
        
        // Eliminar capa anterior si existe
        $('#survey-blur-overlay').remove();
        $('body').append($blurOverlay);
        
        function showBlur() {
            if (isFinished) return;
            $('#survey-blur-overlay').fadeIn(200);
        }
        
        function hideBlur() {
            $('#survey-blur-overlay').fadeOut(200);
        }
        
        // Detectar cuando la ventana pierde el foco
        $(window).on('blur.surveyBlur', function() {
            showBlur();
        });
        
        // Detectar cuando la ventana recupera el foco
        $(window).on('focus.surveyBlur', function() {
            hideBlur();
        });
        
        // Detectar visibilidad de la pestaña
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                showBlur();
            } else {
                hideBlur();
            }
        });
    }

    function stopBlurProtection() {
        isFocusMonitoring = false;
        $('#survey-blur-overlay').remove();
        $(window).off('blur.surveyBlur focus.surveyBlur');
    }

    var SurveyTimer = publicWidget.Widget.extend({
        selector: '.o_survey_form_content',
        
        start: function () {
            this._super.apply(this, arguments);
            setTimeout(startTimer, 300);
            addAntiCopyProtection();
            addDevToolsDetection();
            addWatermark();
            startBlurProtection();
        },
        
        destroy: function () {
            resetTimer();
            stopBlurProtection();
            this._super.apply(this, arguments);
        }
    });

    $(document).ready(function () {
        setTimeout(startTimer, 500);

        addAntiCopyProtection();
        addDevToolsDetection();
        addWatermark();
        
        observer = new MutationObserver(function (mutations) {
            if (isFinished) {
                return;
            }
            
            if ($('.o_survey_finished').length || $('.o_survey_fill_form_done').length) {
                isFinished = true;
                resetTimer();
                stopBlurProtection();
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