/*
Script: ProgressBar

License: MIT-style license.

Copyright: Copyright (c) 2007-2009 [David Walsh](http://davidwalsh.name/).

Author: David Walsh (http://davidwalsh.name)
*/
var ProgressBar = new Class({
    Implements: [Events, Options],

    options: {
        container: document.body,
        progress_class: 'progress_percent',
        text_class: 'progress_text',
        box_class: 'progress_box',
        startPercentage: 0,
        displayText: false,
        speed:10,
        step:1,
        allowMore: false
    },

    initialize: function(options) {
        this.setOptions(options);
        this.options.container = document.id(this.options.container);
        this.createElements();
    },

    //creates the box and percentage elements
    createElements: function() {
        this.box = new Element('div').inject(this.options.container)
                    .addClass(this.options.box_class);
        this.perc = new Element('div', { 
            'style': 'width:0px;' 
        }).inject(this.box).addClass(this.options.progress_class);
        if(this.options.displayText) { 
            this.display = new Element('div').inject(this.box)
                            .addClass(this.options.text_class);
        }
        this.set(this.options.startPercentage);
    },

    //calculates width in pixels from percentage
    calculate: function(percentage) {
        return (this.box.getCoordinates().width * (percentage / 100)).toInt();
    },

    //animates the change in percentage
    animate: function(go) {
        var run = false;
        var self = this;
        if(!self.options.allowMore && go > 100) { 
            go = 100; 
        }
        self.to = go.toInt();
        self.perc.set('morph', { 
            duration: this.options.speed,
            link:'cancel',
            onComplete: function() {
                self.fireEvent('change', [self.to]);
                if(go >= 100) {
                    self.fireEvent('complete',[self.to]);
                }
            }
        }).morph({
            width:self.calculate(go)
        });
        if(self.options.displayText) { 
            this.display.set('text', self.to + '%'); 
        }
        return this;
    },

    //sets the percentage from its current state to desired percentage
    set: function(to) {
        this.animate(to);
        return this;
    },

    //steps a pre-determined percentage
    step: function() {
        this.set(this.to + this.options.step);
        return this;
    },

    destroy: function(){
        this.box.destroy();
    }

});
