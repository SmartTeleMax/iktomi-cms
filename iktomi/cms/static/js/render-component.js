(function(){

    function renderComponent(el){
        var props = JSON.parse(el.dataset.componentProps);
        var state = makeMutable(JSON.parse(el.dataset.componentState));
        var component = React.createElement(React.DOM[props.widget]||Widgets[props.widget], props);
        var rendered = React.render(component, el);
        rendered.setValue(state)
    }

    Blocks.register('render-component', renderComponent);

})()
