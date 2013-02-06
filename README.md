
What's this all about?
=====

jQuery is, without a doubt, the most popular JS framework on the web.
AJAXTerm doesn't implement any formal library for interacting with the DOM or for XHR requests, beyond sarissa, and I don't like this approach.

jQTerm is a jQuery port of AJAXTerm, with some modifications:

- (cross-browser)  jQuery allows for more reliable DOM access & manipulation
- (cross-browser)  jQuery XHR implementation is the defacto standard for web frameworks
- (implementation) Code lends itself much more fully to implementation on existing sites, instead of the original method of deployment


Anything else?
=====

jQTerm is for developers, not for end users. It will require some integration with your website's interface

You should *not* be accessing http://localhost:8022 directly
You should note that there should be a middle layer here, on the server the JS connects to, that interprets the requests and tunnels the request to localhost:8022 (which is the jqterm process)

