(function(){
    var currentUrl = window.location.pathname + window.location.search;
    window.addEvent('domready', function(){
        var isEmpty = $$("#app-content>*").length == 0;

        new Element('div', {'class': 'window-delegate'}).inject($('app-content'));
        Blocks.init(document.body);

        document.querySelector('body').addEventListener('click', onBodyClick, false);

        if (isEmpty) {
            loadPage(null, true);
        }
        resetHelp();
    });

    window.addEvents({'scroll': delegateWindowEvents('scroll'),
                      'mousewheel': delegateWindowEvents('mousewheel'),
                      'keydown': delegateWindowEvents('keydown'),
                      'resize': delegateWindowEvents('resize')})

    window.addEvent = function(type, callback){
        var delegate = this.document.getElement('.window-delegate');
        delegate.addEvent('delegated-'+type, callback);
    }
    window.removeEvent = function(type, callback){
        var delegate = this.document.getElement('.window-delegate');
        delegate.removeEvent('delegated-'+type, callback);
    };

    // XXX not implemented
    window.addEvents = null;
    window.removeEvents = null;

    function onBodyClick(e){
        var link = (e.target.tagName == 'A' && e.target.getAttribute('href')?
                        e.target:
                        e.target.getParent('a[href]'));
        if (link){
            var url = link.getAttribute('href');
            if (url.indexOf('://') != -1 || link.get('rel') == 'internal' ||
                  url.indexOf('javascript:') == 0
                  || e.ctrlKey || e.metaKey || e.shiftKey){
                return;
            }
            e.preventDefault();
            if (link.get('target') == '_blank' || link.get('rel') == 'external'
                || e.which == 2){  // Last check for Chrome middlebutton behaviour
                window.open(link.href);
                return;
            }
            // XXX cleanup

            if (link.get('rel') == 'popup'){
                var popup = new Popup();
                loadPage(url, false, popup.contentEl);
                popup.contentEl.addEvent('domready', function(){
                    popup.show();
                });
                popup.contentEl.addEvent('load', function(){
                    popup.onWindowResize();
                });
                return;
            }

            var itemForms = Array.from($$('.item-form'));
            function doLoad() {
                if (itemForms.length){
                    var itemForm = itemForms.shift();
                    itemForm.retrieve('ItemForm').autoSaveHandler(doLoad);
                } else {
                    loadPage(url);
                }
            }
            doLoad();
        }
    }

    window.addEventListener('popstate', function(e){
        console.log('navigated to: ' + window.location);
        loadPage();
    }, false);

    window.resetHelp = function(){
        if($('help-button') === null){
            return;
        }
        disableHelp(true);
        $$('.navigation').removeClass('help-mode');
        if($$('[data-help-message]').length > 0 || $$('.help-message').length > 0){
          $('help-button').removeClass('hide');
        } else {
          $('help-button').addClass('hide');
        }
    }

    function loadPage(url, force, contentBlock, pushState){
        contentBlock = contentBlock || $('app-content');
        pushState = pushState === undefined? true: pushState;
        var isMain = contentBlock == $('app-content');
        if (!url){
            if (contentBlock.dataset.url) {
                url = contentBlock.dataset.url;
            } else {
                url = window.location.pathname + window.location.search;
            }
        }
        if (isMain && !force && url == currentUrl){
            console.log('Skipping URL (already loaded): ' + url);
            return;
        }
        console.log('loadPage', url);

        (contentBlock.getParent('.popup') || document.body).addClass('loading');
        new Request({
            // add __ajax to avoid caching with browser
            'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax',
            'onSuccess': function(result) {
                onLoadSuccess(url, force, contentBlock, pushState, result);
            }
        }).get();
    }

    function onLoadSuccess(url, force, contentBlock, pushState, result){
        var isMain = contentBlock == $('app-content');
        if (isMain) {
            currentUrl = url;
            var _url = window.location.pathname + window.location.search;
            if (pushState && _url != url) {
                history.pushState(null, null, url);
            } else {
                history.replaceState(null, null, url);
            }
        } else {
            contentBlock.dataset.url = url;
        }
        renderPage(result, contentBlock);
    }

    function renderPage(result, contentBlock){
        try {
            if (typeof result == 'string') {
              result = JSON.decode(result);
            }
        } catch (e){
            return renderHtml(result, contentBlock);
        }


        if (result.location){
            loadPage(result.location, true, result.force_app_reload? undefined : contentBlock, false);
        } else {
            (contentBlock.getParent('.popup') || document.body).removeClass('loading');
        }
    }

    function generalFormSubmit(form){
        var url = form.getProperty('action');
        new Request.JSON({
            // add __ajax to avoid caching with browser
            'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax',
            'onSuccess': function(result){
                console.log('form submitted', form);
                if (result.redirect_to){
                    loadPage(result.redirect_to);
                } else {
                    renderPage(result);
                }
            }
        })[form.method.toLowerCase()](form);
    }

    function renderHtml(result, contentBlock){
        contentBlock = contentBlock || $('app-content');
        contentBlock.setStyle('height', contentBlock.getHeight());

        var options = this.options, response = this.response;

        result = result.stripScripts();

        var titleMatch = result.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if(titleMatch && ! contentBlock.getParent('.popup')){
            document.querySelector('title').set('text', titleMatch[1]);
        }

        if (match) { result = match[1]; }

        var match = result.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        var bodyHtml = match? match[1]: result;
        var temp = new Element('div').set('html', result);
        var content = temp.getElement('.app-content') || temp;

        var evt = document.createEvent("HTMLEvents");
        evt.body = temp;
        evt.content = content;
        evt.html = result;
        evt.initEvent("pre-render", false, true);
        contentBlock.dispatchEvent(evt);

        contentBlock.empty();

        while (content.childNodes.length) {
            contentBlock.appendChild(content.childNodes[0]);
        }

        if (contentBlock == $('app-content')){
            // delegate which is used to pass events from window to listener
            new Element('div', {'class': 'window-delegate'}).inject(contentBlock);
        }

        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("domready", false, true);
        contentBlock.dispatchEvent(evt);

        Blocks.init(contentBlock);
        window.setTimeout(function(){
            contentBlock.setStyle('height', '');
            if (contentBlock.id == 'app-content'){
                if (window.location.hash) {
                    var anchorId = window.location.hash.split('#')[1]
                    if (anchorId && $(anchorId)) {
                        var position = $(anchorId).getPosition().y;
                        var height = document.querySelector('.navigation').getSize().y;
                        var header = contentBlock.getElement('.header');
                        if (header) {
                            height += header.getSize().y;
                        }

                        document.body.scrollTop = position - height - 10;
                    }
                } else {
                    window.scrollTo(window.scrollX, 0);
                }
            }
        }, 2);



        var bodyClass = contentBlock.getElement('[data-body-class]');
        document.body.set('class',
            bodyClass ? bodyClass.dataset.bodyClass : null);
        (contentBlock.getParent('.popup') || document.body).removeClass('loading');

        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("load", false, true);
        contentBlock.dispatchEvent(evt);
        resetHelp();
    };

    function delegateWindowEvents(type){
        // Delegate window events to special element which is utilized every time
        // when #app-content is reloaded.
        // This allows us not to pollute window with outdated event handlers and
        // clean up them automatically.
        return function(e){
            var delegate = this.document.getElement('.window-delegate');
            if (delegate) {
                delegate.fireEvent('delegated-'+type, e);
            }
        }
    }

    window.flashRequestError = function(status){
        if (status == 0) {
            var text = 'Ошибка сети';
        } else if (status/100>>0 == 5){
            var text = 'Ошибка сервера ('+status+')';
        } else if (status == 403){
            var text = 'В доступе отказано. Возможно, утеряна сессия, попробуйте войти заново (ошибка 403)';
        } else if (status == 409){
            var text = 'При сохранении объекта произошел конфликт: два одновременных запроса.\n' +
              ' Подождите несколько секунд и попробуйте снова (ошибка 409)';
        } else if (status/100>>0 == 4){
            var text = 'Ошибка приложения ('+status+')';
        } else {
            var text = 'Ошибка ('+status+')';
        }
        flash(text, 'failure', 10*1000)
        return text
    }

    var tempFailure = Request.prototype.onFailure;
    Request.prototype.onFailure = function(){
        flashRequestError(this.status);
        tempFailure.apply(this, arguments);
        $$('.loading').removeClass('loading'); // XXX
    }
    window.onerror = function(e){
        flash('Ошибка выполнения клиентской программы:\n'+e, 'failure', 10*1000);
    }

    window.scrollAfterSort = function(tr, offset1){
        var offset2 = tr.offsetTop;
        var scrollParent = tr.parentNode;
        while (scrollParent){
            if (scrollParent == tr.ownerDocument){
                return;
            }
            // XXX scrollParent detection is not fine
            if(scrollParent.scrollTop){
                break;
            }
            var overflow = window.getCompiledStyle(scrollParent, 'overflow-y');
            if (scrollParent.scrollHeight < scrollParent.offsetHeight &&
                (overflow == 'auto' || overflow == 'scroll')){
                break;
            }
            scrollParent = scrollParent.parentNode;
        }
        scrollParent.scrollTop += offset2 - offset1;
    }

    // clean up localStorage
    lscache.flushExpired();

    window.loadPage = loadPage;
    window.renderPage = renderPage;
    window.generalFormSubmit = generalFormSubmit;

})();
