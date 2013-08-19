/**
 * Created by actuosus on 8/16/13.
 */

(function () {
  var VersionSwitcher = new Class({

    Implements: Options,

    options: {
      el: null,
      publishedVersionUrl: null,
      workingVersionUrl: null
    },

    initialize: function (el, options) {
      this.el = el;
      this.publishedVersionUrl = options.publishedVersionUrl;
      this.workingVersionUrl = options.workingVersionUrl;
      this.bindEvents();
    },

    bindEvents: function() {
      var _this = this;
      this.el.addEvent('change', function(){
        if (_this.el.checked) {
          loadPage(_this.workingVersionUrl);
        } else {
          loadPage(_this.publishedVersionUrl);
        }
      });
    }
  });

  Blocks.register('version-switcher', function (el) {
    new VersionSwitcher(el.getElement('input'), el.dataset);
  });
})();
