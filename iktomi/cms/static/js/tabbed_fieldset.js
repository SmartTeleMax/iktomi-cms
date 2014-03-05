var TabbedFieldSet = new Class({
  Implements: [Options, Events],
  options: {
    tabbed_fields_list: [],
    tabbed_fields: [],
    common_fields: [],
    field_order: [],
    active_tab: 0,
    trigger_id: null
  },
  
  initialize: function(el, options) {
    this.setOptions(options);
    this.el = $(el);
    this.el.store('widget', this);
    this.triggerField = (this.options.trigger_id) ? $(this.options.trigger_id) : null;
    this.active_tab = this.options.active_tab;
    
    // XXX it is not safe to do this.el.getElements('.switchers span')
    this.switchers = this.el.getElement('.switchers').getElements('span');
    this.tabbed_fields = this.el.getElement('.tabbed_content.fieldset').getChildren('.form-row');
    
    this.switchers.each(function(sw) {
      sw.addEvent('mousedown', function(e) {
        e.stopPropagation(); e.preventDefault();
        this.setTabActive(sw);
      }.bind(this));
    }.bind(this));
    
    this.setTabActive(this.switchers[this.active_tab]);
    this.setTriggerValue(this.active_tab);
    
    // XXX
    //this.el.getElement('tbody > tr > .tabbed_data > .tabbed_content > .fieldset.hidden').removeClass('hidden');
  },

  setTabActive: function(sw){
    this.tabbed_fields.addClass('hidden');
    this.switchers.removeClass('active');
    sw.addClass('active');
    var activeTab = null;
    var related_fields = this.options.tabbed_fields[this.switchers.indexOf(sw)].map(function(field) {
      return this.options.tabbed_fields_list.indexOf(field);
    }.bind(this));
    related_fields.each(function(index) {
      var t = this.tabbed_fields[index];
      //t.getParent().adopt(t);
      t.removeClass('hidden');
      if (!t.hasClass('last')){
        activeTab = t;
      }
    }.bind(this));
    this.setTriggerValue(this.switchers.indexOf(sw));
    if(activeTab){
      this.fireEvent('change', activeTab);
    }
  },
  
  setTriggerValue: function(value) {
    if (this.triggerField) {
      if (this.triggerField.nodeName == 'INPUT') {
        this.triggerField.value = value;
      } else {
        throw Error('triggerField should be represented with "input" widget');
      }
    }
  }
  
});

Blocks.register('tabbed-fieldset', function(el){
    new TabbedFieldSet(el, JSON.parse(el.dataset.config));
});
