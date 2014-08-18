/** @jsx React.DOM */

(function(){

    var buttonProto = {
        getInitialState: function() {
            var state = this.props.state;
            delete this.props.state;
            return state;
        },
        onClick: function(e){
            e.preventDefault();
            var options = this.submitOptions();
            this.act(options);
        },
        submitOptions: function(){
            return {title: this.props.title,
                    itemForm: this.props.item_form};
        },
        render: function() {
            var action = this.props;
            var className = "button action-" + action.action + 
                                  (action.cls? " icon-" + action.cls: "");
            var url = this.state ?action.url.replace('ITEM_ID', this.state.id) : "";
            return <a href={url}
                      rel={action.mode}
                      title={action.hint || undefined}
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
            options.url = this.props.url;
            this.props.form.postHandler(options);
        }
    });

    var saveAndBackProto = Object.merge({}, buttonProto, {
        act: function(options){
            options.redirect = this.props.url;
            this.props.form.saveHandler(options);
        }
    });
    var redirectProto = Object.merge({}, buttonProto, {
        act: function(options){
            options.redirect = this.props.url;
            this.props.form.redirectHandler(options);
        }
    });
    var getProto = Object.merge({}, buttonProto, {
        onClick: function(e){}
    });

    var GetButton = React.createClass(getProto);
    var PostButton = React.createClass(postProto);
    var RedirectButton = React.createClass(redirectProto);
    var SaveAndContinueButton = React.createClass(saveAndContinueProto);
    var SaveAndBackButton = React.createClass(saveAndBackProto);

    window.ItemButtons = {
        "custom": PostButton,
        "get": GetButton,
        "post": PostButton,
        "save-and-continue": SaveAndContinueButton,
        "save-and-add": RedirectButton,
        "save-and-back": SaveAndBackButton
    }


    window.ButtonPanel = React.createClass({
        getInitialState: function() {
            var state = this.props.state;
            delete this.props.state;
            return state;
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
                    props.state = this.props.state || this.state;

                    var Component = ItemButtons[props.action]||ItemButtons[props.mode];
                    var button = Component(props);

                    buttons.push(button);
                }

                if (buttons.length > 1) {
                    ws.push(<div key={buttons[0].props.key+'-group'}
                                 className="buttons-group">
                              {buttons}
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
