/** @jsx React.DOM */

(function(){

    var buttonProto = {
        getInitialState: function() {
            var state = this.props.state;
            delete this.props.state;
            return {'item': state};
        },
        onClick: function(e){
            e.preventDefault(); e.stopPropagation();
            var options = this.submitOptions();
            this.act(options);
        },
        submitOptions: function(){
            return {title: this.props.title,
                    itemForm: this.props.item_form};
        },
        isVisible: function(){ return true; },
        getUrl: function(){
            return this.props.url.replace('ITEM_ID', this.state.item.id || '+');
        },
        render: function() {
            var action = this.props;
            var visible = this.isVisible();
            var className = "button action-" + action.action + 
                                  (action.cls? " icon-" + action.cls: "");
            className += visible ? '' : ' hidden';
            return <a href={this.getUrl()}
                      title={visible ? (action.hint || undefined) : undefined}
                      onClick={this.onClick}
                      className={className}>{action.title}</a>
        }
    }

    var saveAndContinueProto = Object.merge({}, buttonProto, {
        act: function(options){
            this.props.form.saveAndContinueHandler(options);
        }
    });

    var postProto = Object.merge({}, buttonProto, {
        act: function(options){
            options.url = this.getUrl();
            this.props.form.postHandler(options);
        }
    });

    var saveAndBackProto = Object.merge({}, buttonProto, {
        act: function(options){
            options.redirect = this.getUrl();
            this.props.form.saveHandler(options);
        }
    });
    var redirectProto = Object.merge({}, buttonProto, {
        act: function(options){
            options.redirect = this.getUrl();
            this.props.form.redirectHandler(options);
        }
    });
    var getProto = Object.merge({}, buttonProto, {
        onClick: function(e){}
    });


    var publishProto = Object.merge({}, postProto, {
        isVisible: function(){
          var s = this.state.item;
          return s.existing && 
                  (s.has_unpublished_changes || !s.public) &&
                  (s.permissions.indexOf('p') != -1) &&
                  (s.version == 'admin');
        }
    });

    var unpublishProto = Object.merge({}, postProto, {
        isVisible: function(){
          var s = this.state.item;
          return s.public &&
                  (s.permissions.indexOf('p') != -1) &&
                  (s.version == 'admin');
        }
    });

    var revertProto = Object.merge({}, postProto, {
        isVisible: function(){
          var s = this.state.item;
          return s.existing &&
                  (s.has_unpublished_changes || s.draft) &&
                  (s.permissions.indexOf('p') != -1) &&
                  (s.version == 'admin');
        }
    });


    var GetButton = React.createClass(getProto);
    var PostButton = React.createClass(postProto);
    var RedirectButton = React.createClass(redirectProto);
    var SaveAndContinueButton = React.createClass(saveAndContinueProto);
    var SaveAndBackButton = React.createClass(saveAndBackProto);


    var PublishButton = React.createClass(publishProto);
    var UnpublishButton = React.createClass(unpublishProto);
    var RevertButton = React.createClass(revertProto);

    window.ItemButtons = {
        "custom": PostButton,
        "get": GetButton,
        "post": PostButton,
        "save-and-continue": SaveAndContinueButton,
        "save-and-add": RedirectButton,
        "save-and-back": SaveAndBackButton,

        'publish': PublishButton,
        'unpublish': UnpublishButton,
        'revert': RevertButton
    }


    window.ButtonPanel = React.createClass({
        getInitialState: function() {
            var state = this.props.state;
            delete this.props.state;
            return {'item': state};
        },
        setItemState: function(itemState){
            itemState = _mergeObjects(this.state.item, itemState);
            this.setState({'item': itemState});
        },
        render: function() {
            //this.widgetsByName = {};
            var ws = [];
            for (var i=0; i<this.props.buttons.length; i++){
                var group = this.props.buttons[i];
                var buttons = [];

                for (var j=0; j<group.length; j++){
                    props = group[j];
                    props.form = this.props.form;
                    props.parent = this;
                    props.key = props.action + '-' + props.mode;
                    props.state = this.props.state || this.state.item;

                    var Component = ItemButtons[props.action]||ItemButtons[props.mode];
                    var button = React.createElement(Component, props);

                    buttons.push(button);
                }

                if (buttons.length > 1) {
                    ws.push(<div key={buttons[0].key+'-group'}
                                 className="buttons-group">
                              <div>{buttons}</div>
                            </div>);
                } else {
                    ws.push(buttons[0])
                }
            }

            return <div>{ws}</div>;
        }
    });

    window.ButtonPanel.fromJSON = function(form, json, state){
        var buttons = JSON.parse(json);
        var state = JSON.parse(state);
        props = {form: form,
                 buttons: buttons,
                 state: state};
        return ButtonPanel(props);
    }

})();
