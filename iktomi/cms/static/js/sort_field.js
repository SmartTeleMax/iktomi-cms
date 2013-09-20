(function(){
  function SortFields(el){
    var select = el.getParent('.stream').getElement('.filter-form select.js-sort-field');
    if (! select) { return; }

    var sort = select.get('value');
    var desc = sort.charAt(0) == '-';
    if (desc){ sort = sort.substr(1); }

    select.getElements('option').each(function(opt){
      if (!opt.value || opt.value.charAt(0) == '-') { return; }
      var th = el.getElement('.field_'+opt.get('text').trim());

      if(th && !th.hasClass('sortable')){
        th.addClass('sortable');
        th.dataset.sortProperty = opt.value;
        if (opt.value == sort){
          th.addClass('sortable-' + (desc? 'desc': 'asc'));
        }

        th.addEvent('click', function(){
          var toDesc = this.hasClass('sortable-asc');
          select.set('value', (toDesc ? '-' : '') + th.dataset.sortProperty);
          select.getParent('form').retrieve('submitFilter')();
        });
      }
    })
  }

  Blocks.register('sort-fields', SortFields);
})();
