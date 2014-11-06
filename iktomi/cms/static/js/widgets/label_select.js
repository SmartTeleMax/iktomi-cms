(function(){
  var LabelSelect = function(el) {
      this.element = el;
      this.multiple = this.element.dataset.multiple;
      this.element.getElements('input').addEvent('change', this.update.bind(this));
      this.update()
  }

  LabelSelect.prototype = {
    update: function(){
      var labels = this.element.getElements('label');
      for (var i=labels.length;i--;){
        var label = labels[i];
        var isOn = label.getElement('input').checked;
        label[isOn?'addClass':'removeClass']('selected');
      }
    }
  }

  Blocks.register('label-select', function(e){
    new LabelSelect(e);
  });
})();
