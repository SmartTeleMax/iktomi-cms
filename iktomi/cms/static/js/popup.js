_popup_id = (function(){
  var _id = 0;
  return function() {
    return 'popup-' + _id++;
  }
})();

var Popup = new Class({

  Implements: [Events, Options],
  
  options: {
    'close_button_on': true,
    'clickable_overlay': true
  },

  onHide: $empty,

  initialize: function(id, options) {
    this.id = id || _popup_id();
    this.setOptions(options);

    this.zindex=100;

    this.el = new Element('table', {'class': 'popup'});
    this.el.store('popup', this);

    this.overlay =  new Element('div', {'id':this.id+'-overlay', 'class':'overlay'}).inject(document.body);
    this.loader = new Element('div', {'id':this.id+'-stream_loader', 'class':'loader hide'}).inject(document.body);

    this.contentEl = new Element('div', {'class': 'popup-body', 'id':this.id+'-popup-body'});
    this.fixedContent = new Element('div', {'class': 'popup-body-fixed', 'id': this.id+'-popup-body-fixed'});
    this.titleEl = new Element('div', {'class': 'popup-title', 'id': this.id+'-popup-title'});
    this.filters = new Element('div', {'class': 'popup-filters sidefilter', 'id':this.id+'-popup-filters'});
    // this.paginator_top = new Element('div', {'class': 'popup-pagination', 'id':this.id+'-popup-pagination-top'});
    // this.paginator_bottom = new Element('div', {'class': 'popup-pagination', 'id':this.id+'-popup-pagination-bottom'});

    this.el.adopt([
      new Element('tbody').adopt([
        new Element('tr').adopt([
          new Element('td', {'class': 'popup-top-left'}),
          new Element('td', {'class': 'popup-border-top'}),
          new Element('td', {'class': 'popup-top-right'})
        ]),
        new Element('tr').adopt([
          new Element('td', {'class': 'popup-border-left'}),
          new Element('td', {'class': 'popup-content'}).adopt(this.titleEl, this.fixedContent, this.filters, this.contentEl),
          new Element('td', {'class': 'popup-border-right'})
        ]),
        new Element('tr').adopt([
          new Element('td', {'class': 'popup-bottom-left'}),
          new Element('td', {'class': 'popup-border-bottom'}),
          new Element('td', {'class': 'popup-bottom-right'})
        ])
      ])
    ]).inject(document.body);

    this.empty();
    this._hide = function(e){
      if (e && e.stop) {
        e.stop();   
      }
      this.hide();
    }.bind(this);

    if(this.options.close_button_on){
      this.close_btn = new Element('div', {'class': 'popup-close-btn'});
      this.el.getElement('td.popup-top-right').adopt(this.close_btn);
      this.close_btn.addEvent('mousedown', this._hide);
    }
    if(this.options.clickable_overlay)
      this.overlay.addEvent('mousedown', this._hide);
    this.overlay.setStyle('opacity', 0);
    this.onWindowResize()
    this._onWindowResize = this.onWindowResize.bind(this);
    this._onMouseWheel = this.onMouseWheel.bind(this);
  },

  disableClose: function() {
    this.overlay.removeEvent('mousedown', this._hide);
    $('stream_popup-close-btn').dispose();
    return this;
  },

  empty: function() {
    this.contentEl.empty();
    this.fixedContent.empty();
    this.titleEl.empty();
    this.filters.empty();
    // this.paginator_top.empty();
    // this.paginator_bottom.empty();
    this.contentEl.className = 'popup-body';
    this.contentEl.setAttribute('style', '');
    return this;
  },

  setZindex: function(){
    var zindex=0;
    $$('.popup').each(function(p){
      popup = p.retrieve('popup');
      if(popup.visible == true && popup.zindex > zindex){
        zindex = popup.zindex;
      }
    });
    this.zindex = zindex+2;
    this.overlay.setStyle('z-index', this.zindex);
    this.loader.setStyle('z-index', this.zindex+1);
    this.el.setStyle('z-index', this.zindex+1);
  },

  show: function() {
    this.setZindex();
    this.visible = true;

    window.addEvent('resize', this._onWindowResize);
    window.addEvent('scroll', this._onWindowResize);
    window.addEvent('mousewheel', this._onMouseWheel);
    this.overlay.setStyles({
      'top': -window.getScroll().y,
      'height': window.getScrollSize().y + window.getScroll().y,
      'display': 'block',
      'opacity': 0.3
    });

    if (Browser.Engine.trident) {
      $$('select').setStyle('visibility', 'hidden');
    };
    this.el.setStyle('display', 'block');
    this.onWindowResize();
    this.el.setStyle('visibility', 'visible')
  },

  setContent: function(html) {
    this.contentEl.innerHTML = html;
    return this;
  },

  setTitle: function(title) {
    this.titleEl.empty().set('html', title);
    return this;
  },

  setClass: function(cls) {
    this.contentEl.addClass(cls);
    return this;
  },

  removeClass: function() {
    this.contentEl.className = 'popup-body';
    return this;
  },

  adopt: function() {
    this.contentEl.adopt(arguments);
    return this;
  },

  setFilters: function() {
    this.filters.adopt(arguments);
    this.contentEl.addClass('with_filters');
    // this.paginator_top.addClass('with_filters');
    // this.paginator_bottom.addClass('with_filters');
    return this;
  },

  addPage: function(page) {
    var bottom_page = page.clone();
    // this.paginator_top.adopt(page);
    // this.paginator_bottom.adopt(bottom_page.cloneEvents(page));
    return this;
  },

  setFixedContent: function(){
    this.fixedContent.adopt(arguments);
    return this;
  },

  onMouseWheel: function(e) {
    var pos = this.contentEl.getScroll().y;
    if (e.wheel>0) {
      this.contentEl.scrollTo(0, Math.max(0, pos-50));
    } else if (e.wheel<0) {
      this.contentEl.scrollTo(0, pos+50);
    };
    e.stop();
  },

  onWindowResize: function() {
    var paddings = 2*5; /* hard-coded */
    var extraHeight = this.el.getHeight()-this.contentEl.getHeight()-this.fixedContent.getHeight();// -this.paginator_bottom.getHeight()-this.paginator_top.getHeight();
    var maxHeight = window.getHeight()-40;
    var maxContentHeight = maxHeight-extraHeight;
    this.contentEl.setStyle('max-height', maxContentHeight-paddings);
    /* For IE, which doesn't account paddings */
    if (this.contentEl.getScrollSize().y>maxContentHeight) {
      this.contentEl.setStyle('height', maxContentHeight);
    } else if (this.contentEl.getScrollSize().y<maxContentHeight) {
      this.contentEl.setStyle('height', 'auto');
    };
    var left = Math.ceil((this.overlay.getWidth() - this.el.getWidth()) / 2);
    var top = Math.ceil((window.getSize().y - this.el.getHeight()) / 2) + window.getScroll().y;

    top = (top<0)?0:top;
    left = (left<0)?0:left;

    this.el.setStyles({
      'left': left,
      'top': top
    });

    this.overlay.setStyle('width', document.body.scrollWidth);
  },

  hide: function() {
    this.hide_loader();
    this.visible = false;
    this.zindex = 100;
    if (Browser.Engine.trident) {
      var top_popup = null;
      $$('.popup').each(function(p){
        var popup = p.retrieve('popup');
        if(popup.visible == true && top_popup.zindex < popup.zindex && popup != this){
          top_popup = popup;
        }
      });
      if(top_popup){
        top_popup.getElements('select').setStyle('visibility', 'visible');
      } else {
        $$('select').setStyle('visibility', 'visible');
      }
    };
    this.el.setStyles({
      visibility: 'hidden',
      display: 'none',
      top: 0,
      left: 0
    });
    this.empty();
    this.overlay.setStyles({height: 0, opacity: 0});
    window.removeEvent('resize', this._onWindowResize);
    window.removeEvent('scroll', this._onWindowResize);
    window.removeEvent('mousewheel', this._onMouseWheel);
    this.onHide();
  },

  'destroy': function(){
    this.overlay.destroy();
    this.el.destroy();
    this.loader.destroy();
    delete this;
  },
  
  show_loader: function() {
    this.setZindex();
    this.visible = true;
    this.overlay.setStyles({
      top: -window.getScroll().y,
      height: window.getScrollSize().y + window.getScroll().y,
      display: 'block',
      opacity: 0.3
    });
    this.loader.setStyles({
      left: Math.ceil((this.overlay.getWidth() - this.loader.getWidth()) / 2),
      top: Math.ceil((window.getSize().y - this.loader.getHeight()) / 2) + window.getScroll().y
    });
    this.loader.removeClass('hide');
  },

  hide_loader: function(){
    this.loader.addClass('hide');
  }

});