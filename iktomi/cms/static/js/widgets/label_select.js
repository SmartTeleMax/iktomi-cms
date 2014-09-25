var LabelSelect = new Class({
    initialize: function(el) {
      var multiple = el.hasClass('multiple');
      var input = el.getElements('.value')[0];
      var name = input.name;

      el.getElements('.label-select__option').addEvent('click', function(e){
        var value = this.getNext().value;
        if (!multiple) {
            el.getElements('.label-select__option').removeClass('selected');
            input.value = this.getNext().value;
            this.addClass('selected');
        } else {
            if (this.hasClass('selected')){
                el.getElement('input[value="' + value + '"]').destroy();
            } else {
                new Element('input', {
                    'value': value, 'name': name, 'type': 'hidden'
                }).inject(el, 'top');
            }
            this.toggleClass('selected');
        }
      });
    }
});

Blocks.register('label-select', function(e){
    new LabelSelect(e);
});
