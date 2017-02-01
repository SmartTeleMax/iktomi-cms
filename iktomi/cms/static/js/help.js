(function(){
    function showPopup(anchor) {
      return function(e){
        if(!anchor.dataset.helpMessage || !anchor.dataset.helpMessage.replace(/\s+/g, '')){
          return;
        }
        var sizes = anchor.getBoundingClientRect();
        var popupOffset = {
          top:sizes.top - 5,
          left:sizes.left - 5,
          height:sizes.height + 10,
        }
        var popup = Element('div', {
          class:'help-popup hidden',
          style:'top:'+(popupOffset.top+popupOffset.height+10)+'px; left:0px;'
        });
        popup.innerHTML = anchor.dataset.helpMessage;
        popup.inject($('app-content'));
        var popupWidth = popup.getBoundingClientRect().width;
        if(window.innerWidth - popupOffset.left < popupWidth){
          popup.setStyle('left', window.innerWidth - (popupWidth + 20));
        }else{
          popup.setStyle('left', popupOffset.left);
        }
        popup.removeClass('hidden');
      }
    }

    function hidePopup(e) {
      $$('div.help-popup').destroy();
    }

    function disableLinkAndEnableHelp(anchor){
      if(getComputedStyle(anchor).visibility == 'hidden'){
        return;
      }
      var sizes = anchor.getBoundingClientRect();
      var wrapperSizes = {
        top:sizes.top,
        left:sizes.left,
        height:sizes.height,
        width:sizes.width,
      }
      var htmlClass = "help-wrapper";
      if(anchor.getParent('.header')){
        htmlClass = "help-wrapper-header";
      }else{
        wrapperSizes.top = anchor.offsetTop;
        wrapperSizes.left = anchor.offsetLeft;
      }
      var wrapperDiv = Element('div', {
        class: htmlClass,
        style: "top:"+wrapperSizes.top +"px; left: "+ wrapperSizes.left +"px; height: "+wrapperSizes.height+"px; width:"+wrapperSizes.width+"px;"
      });
      wrapperDiv.addEventListener('click', function(e){ e.stopPropagation(); });
      wrapperDiv.addEventListener('mouseenter', showPopup(anchor));
      wrapperDiv.addEventListener('mouseleave', hidePopup);
      wrapperDiv.inject(anchor.getParent());
    }

    function getOffsetTop( elem )
    {
      // getting global element offset from the top of the document
      var offsetTop = 0;
      do {
        if ( !isNaN( elem.offsetTop ) )
        {
            offsetTop += elem.offsetTop;
        }
      } while(elem = elem.offsetParent);
      return offsetTop;
    }

    function getHeaderHeight(){
      return $$('.navigation')[0].offsetHeight + $$('.header')[0].offsetHeight + 20; // 20 px gap
    }

    function getCurrentVisibleElement(){
      var elementForScroll = null;

      function getDistanceFromHeader(element){
        return Math.abs(getOffsetTop(element) - scrollY - getHeaderHeight());
      }

      if(window.scrollY > 0){
        $$('.form-row').each(function(el){
          if(el.style.display == 'none'){
            return;
          }
          if(elementForScroll == null){
            elementForScroll = el;
          } else if(getDistanceFromHeader(el) < getDistanceFromHeader(elementForScroll)){
            elementForScroll = el;
          }
        });
      }
      return elementForScroll;
    }

    function enableElements(elements, newPageLoaded){
      elements.removeClass('noteditable');
      if(!newPageLoaded){
        elements.each(function(el){
          el.setProperty('tabindex', el.retrieve('tabindex'));
        });
      }
    };

    function disableElements(elements){
      elements.addClass('noteditable');
      elements.each(function(el){
        el.store('tabindex', el.tabIndex);
        el.setProperty('tabindex', -1);
      })
    };

    window.enableHelp = function(){
      // disabling editing on all things
      disableElements($$('input', 'label', 'textarea','.compact-toggle',
            'iframe', '.state-corrected', '.button', 'button',
            'td', 'th','.up-btn', '.down-btn' ));
      var navigationColor = getComputedStyle($$('.navigation')[0]).backgroundColor;
      $$('.help-overlay').setStyle('background-color', navigationColor);
      $$('.help-message').removeClass('hide');
      $$('.buttons__save-hidden').addClass('hide');
      $$('.button__edit-actions').addClass('hide');
      $('help-button').innerText = 'Закрыть помощь';
      $$('[data-help-message]').each(disableLinkAndEnableHelp);
      $$('.help-overlay').removeClass('hide');
      $$('.help-global').removeClass('hide');
    }

    window.disableHelp = function(newPageLoaded){
      // enabling editing
      enableElements($$('input', 'label', 'textarea', '.compact-toggle',
            'iframe', '.state-corrected', '.button', 'button',
            'td', 'th', '.up-btn', '.down-btn'), newPageLoaded);
      $$('.help-message').addClass('hide');
      $$('.buttons__save-hidden').removeClass('hide');
      $$('.button__edit-actions').removeClass('hide');
      $('help-button').innerText = 'Помощь';
      $$('div.help-wrapper').destroy();
      $$('div.help-wrapper-header').destroy();
      $$('.help-overlay').addClass('hide');
      $$('.help-global').addClass('hide');
    }

    window.toggleHelpMode = function() {
      var elementForScroll = getCurrentVisibleElement();
      $$('.navigation').toggleClass('help-mode');

      if($$('.navigation')[0].hasClass('help-mode')) {
        enableHelp();
      } else {
        disableHelp();
      }
      if(elementForScroll != null){
        window.scrollTo(0, getOffsetTop(elementForScroll)-getHeaderHeight());
      }
    }

})();
