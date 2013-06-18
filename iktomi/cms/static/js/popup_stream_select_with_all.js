var PopupStreamSelectWithAllMultiple = new Class({
  Extends: PopupStreamSelectMultiple,

  onContentRecieved: function(html, scripts, redirect) {
    this.parent(html, scripts, redirect)
    if (!this.popup.el.getElement('form.filter-form')) { return; }

    var selectButton = new Element('a', {'href':'#', 
                                         'text':'выбрать все',
                                         'class':'button'});
    var deselectButton = new Element('a', {'href':'#', 
                                         'text':'убрать выбор текущих',
                                         'class':'button'});

    selectButton.addEvent('click', function(e) {
        e.stop();
        this.popup.contentEl.getElements('.item').each(function(item) {
            var id = item.getElement('a').getProperty('rel').match(/^id:(.*)+/)[1];
            if (this._selected_items.indexOf(id) == -1) {
                this.add(item, id);
            }
        }.bind(this));
    }.bind(this));

    deselectButton.addEvent('click', function(e) {
        e.stop();
        this.popup.contentEl.getElements('.item').each(function(item) {
            var id = item.getElement('a').getProperty('rel').match(/^id:(.*)+/)[1];
            if (this._selected_items.indexOf(id) != -1) {
                this.remove(id);
            }
        }.bind(this));
    }.bind(this));

    this.popup.el.getElement('form.filter-form fieldset').parentNode.adopt(selectButton);
    this.popup.el.getElement('form.filter-form fieldset').parentNode.adopt(deselectButton);
  }
});

Blocks.register('popup-stream-select-with-all', function(el){
    new PopupStreamSelectWithAllMultiple(el.dataset.readonly && false,
                                  JSON.parse(el.dataset.config));
});
