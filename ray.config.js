module.exports = {
    enable: true,
    host: 'localhost',
    port: 23517,
    scheme: 'http', //only change this if you know what you're doing!

    // calls to console.log() are redirected to Ray
    intercept_console_log: true,
    
    // determine the enabled state using the specified callback
    // the 'enable' setting is also considered when using this setting.
    enabled_callback: () => {
        return functionThatReturnsABoolean();
    },
    
    sending_payload_callback: (rayInstance, payloads) => {
        rayInstance.html('this is sent before every payload');
        if (payloads[0].getType() === 'custom') {
            payloads[0].data.content.content = 'payloads can be modified here';
        }
    },
    
    sent_payload_callback: (rayInstance) => {
        // automatically make all payloads sent to Ray green.
        rayInstance.green();
    },
}
