This article I will introduce the net/rpc in go standard library.This is a very tiny and powerful feature and deserves to study.
## Typical RPC Architecture and Features
![]({{ site.baseurl }}/assets/img/rpc/1.png)
### protocol
1. transport protocol
    - tcp
    - http
    - ...
2. data protocol
    - encoding
        - json
        - xml
        - protobuf
        - ...
    - payload schema

3. api definition
    - pb file
    - rules established by implementer
    - ...

### server feature
1. registration  
    - service registration
2. listen and accept client connection
3. handle client request in loop
    - decode request
    - call service method
    - encode response
4. concurrently and sync/async
### client feature
1. call remote service
    - encode request
    - send request
    - decode response
2.  handle server response in loop
    - decode response
    - call callback 
2. concurrently and sync/async

## RPC in go
### Transport Protocol
- customer defined
    ```go
    // Accept accepts connections on the listener and serves requests
    // to [DefaultServer] for each incoming connection.
    // Accept blocks; the caller typically invokes it in a go statement.
    func Accept(lis net.Listener) { DefaultServer.Accept(lis) }

    // A Listener is a generic network listener for stream-oriented protocols.
    
    //
    // Multiple goroutines may invoke methods on a Listener simultaneously.
    type Listener interface {
        // Accept waits for and returns the next connection to the listener.
        Accept() (Conn, error)

        // Close closes the listener.
        // Any blocked Accept operations will be unblocked and return errors.
        Close() error

        // Addr returns the listener's network address.
        Addr() Addr
    }
    ```
    So any connection that implements the `net.Listener` interface can be used as a transport protocol.  
    
    **http** 

    ```go
    arith := new(Arith)
    rpc.Register(arith)
    rpc.HandleHTTP()
    l, e := net.Listen("tcp", ":1234")
    if e != nil {
        log.Fatal("listen error:", e)
    }
    go http.Serve(l, nil)

    //client
    client, err := rpc.DialHTTP("tcp", serverAddress + ":1234")
    if err != nil {
        log.Fatal("dialing:", err)
    }
    ```
    **tcp**
    ```go
    arith := new(Arith)
    rpc.Register(arith)
    l, err := net.Listen("tcp", "127.0.0.1:0") 
    if err != nil {
        log.Fatal("listen error:", err)
    }
    for {
        conn, err := l.Accept()
        if err != nil {
            log.Fatal("accept error:", err)
        }
        go rpc.ServeConn(conn)
    }
    ```

### Data Protocol
1. encoding
    - gob(NewClient)
    - customer defined(NewClientWithCodec)  

    **client**
    ```go
    // A ClientCodec implements writing of RPC requests and
    // reading of RPC responses for the client side of an RPC session.
    // The client calls [ClientCodec.WriteRequest] to write a request to the connection
    // and calls [ClientCodec.ReadResponseHeader] and [ClientCodec.ReadResponseBody] in pairs
    // to read responses. The client calls [ClientCodec.Close] when finished with the
    // connection. ReadResponseBody may be called with a nil
    // argument to force the body of the response to be read and then
    // discarded.
    // See [NewClient]'s comment for information about concurrent access.
    type ClientCodec interface {
        WriteRequest(*Request, any) error
        ReadResponseHeader(*Response) error
        ReadResponseBody(any) error

        Close() error
    }

    // NewClient returns a new [Client] to handle requests to the
    // set of services at the other end of the connection.
    // It adds a buffer to the write side of the connection so
    // the header and payload are sent as a unit.
    //
    // The read and write halves of the connection are serialized independently,
    // so no interlocking is required. However each half may be accessed
    // concurrently so the implementation of conn should protect against
    // concurrent reads or concurrent writes.
    func NewClient(conn io.ReadWriteCloser) *Client {
        encBuf := bufio.NewWriter(conn)
        client := &gobClientCodec{conn, gob.NewDecoder(conn), gob.NewEncoder(encBuf), encBuf}
        return NewClientWithCodec(client)
    }

    // NewClientWithCodec is like [NewClient] but uses the specified
    // codec to encode requests and decode responses.
    func NewClientWithCodec(codec ClientCodec) *Client {
        client := &Client{
            codec:   codec,
            pending: make(map[uint64]*Call),
        }
        go client.input()
        return client
    }
    ```

    **server**
    ```go
    // A ServerCodec implements reading of RPC requests and writing of
    // RPC responses for the server side of an RPC session.
    // The server calls [ServerCodec.ReadRequestHeader] and [ServerCodec.ReadRequestBody] in pairs
    // to read requests from the connection, and it calls [ServerCodec.WriteResponse] to
    // write a response back. The server calls [ServerCodec.Close] when finished with the
    // connection. ReadRequestBody may be called with a nil
    // argument to force the body of the request to be read and discarded.
    // See [NewClient]'s comment for information about concurrent access.
    type ServerCodec interface {
        ReadRequestHeader(*Request) error
        ReadRequestBody(any) error
        WriteResponse(*Response, any) error

        // Close can be called multiple times and must be idempotent.
        Close() error
    }

    // ServeConn runs the [DefaultServer] on a single connection.
    // ServeConn blocks, serving the connection until the client hangs up.
    // The caller typically invokes ServeConn in a go statement.
    // ServeConn uses the gob wire format (see package gob) on the
    // connection. To use an alternate codec, use [ServeCodec].
    // See [NewClient]'s comment for information about concurrent access.
    func ServeConn(conn io.ReadWriteCloser) {
        DefaultServer.ServeConn(conn)
    }

    // ServeCodec is like [ServeConn] but uses the specified codec to
    // decode requests and encode responses.
    func ServeCodec(codec ServerCodec) {
        DefaultServer.ServeCodec(codec)
    }
    ```
    So any codec that implements the `ServerCodec` interface can be used as codec in server side.If client use gob as data protocol, you can use `ServeConn(conn io.ReadWriteCloser)`,this method will use gob as the data protocol.
    If client use a specified codec as data protocol, you can use `ServeCodec(codec ServerCodec)`,this method will use the specified codec as the data protocol.And `jsonrpc` is a built-in codec in go, you can use `rpc.ServeCodec(jsonrpc.NewServerCodec(conn))` to use it.
    Codec has a 2 responsibilities:
    - encode to memory.It contains construct the messge data.
    - decode from memory.It contains idetidy the boundary of message.  

2. payload schema
Typically, the data schema is as follows:
    - request
    ```
    +-------------------+
    | Request Header    |  <-- ServiceMethod and Seq
    +-------------------+
    | Serialized Args   |  <-- Serialized business data (call arguments)
    +-------------------+
    ```

    - response
    ```
    +-------------------+
    | Response Header   |  <--  ServiceMethod、Seq
    +-------------------+
    | Serialized Reply  |  <-- Serialized business data (return values)
    +-------------------+
    ```
    
    ```go
    // Request is a header written before every RPC call. It is used internally
    // but documented here as an aid to debugging, such as when analyzing
    // network traffic.
    type Request struct {
        ServiceMethod string   // format: "Service.Method"
        Seq           uint64   // sequence number chosen by client
        next          *Request // for free list in Server
    }

    // Response is a header written before every RPC return. It is used internally
    // but documented here as an aid to debugging, such as when analyzing
    // network traffic.
    type Response struct {
        ServiceMethod string    // echoes that of the Request
        Seq           uint64    // echoes that of the request
        Error         string    // error, if any.
        next          *Response // for free list in Server
    }

    func (c *gobClientCodec) WriteRequest(r *Request, body any) (err error) {
        if err = c.enc.Encode(r); err != nil {
            return
        }
        if err = c.enc.Encode(body); err != nil {
            return
        }
        return c.encBuf.Flush()
    }
    ```
Actually,the data shcema rely on the codec you use.

### Api Definition  
    Only methods that satisfy these criteria will be made available for remote access

  - the method's type is exported.
  - the method is exported.
  - the method has two arguments, both exported (or builtin) types.
  - the method's second argument is a pointer.
  - the method has return type error.

    In effect, the method must look schematically like

	    func (t *T) MethodName(argType T1, replyType *T2) error

## concurrently and sync/async
### client side call 
- sync
    ```go
    // Call invokes the named function, waits for it to complete, and returns its error status.
    func (client *Client) Call(serviceMethod string, args any, reply any) error {
        call := <-client.Go(serviceMethod, args, reply, make(chan *Call, 1)).Done
        return call.Error
    }
    ```
- async
    ```go
    // Go invokes the function asynchronously. It returns the [Call] structure representing
    // the invocation. The done channel will signal when the call is complete by returning
    // the same Call object. If done is nil, Go will allocate a new channel.
    // If non-nil, done must be buffered or Go will deliberately crash.
    func (client *Client) Go(serviceMethod string, args any, reply any, done chan *Call) *Call {
        call := new(Call)
        call.ServiceMethod = serviceMethod
        call.Args = args
        call.Reply = reply
        if done == nil {
            done = make(chan *Call, 10) // buffered.
        } else {
            // If caller passes done != nil, it must arrange that
            // done has enough buffer for the number of simultaneous
            // RPCs that will be using that channel. If the channel
            // is totally unbuffered, it's best not to run at all.
            if cap(done) == 0 {
                log.Panic("rpc: done channel is unbuffered")
            }
        }
        call.Done = done
        client.send(call)
        return call
    }
    ```

    ```go
    // NewClientWithCodec is like [NewClient] but uses the specified
    // codec to encode requests and decode responses.
    func NewClientWithCodec(codec ClientCodec) *Client {
        client := &Client{
            codec:   codec,
            pending: make(map[uint64]*Call),
        }
        go client.input()
        return client
    }

    func (client *Client) input() {
    var err error
    var response Response
    for err == nil {
        response = Response{}
        err = client.codec.ReadResponseHeader(&response)
        if err != nil {
            break
        }
        seq := response.Seq
        client.mutex.Lock()
        call := client.pending[seq]
        delete(client.pending, seq)
        client.mutex.Unlock()
    ```
**Client hold a pending map to store not finished call.Another goroutine will read the response from server and put it into the `pending` map.**   

### server side
```go
    type Server struct {
        serviceMap sync.Map   // map[string]*service
        reqLock    sync.Mutex // protects freeReq
        freeReq    *Request
        respLock   sync.Mutex // protects freeResp
        freeResp   *Response
    }
    ```
Using `freeReq` and `freeResp` to reuse the memory to reduce the memory allocation.

```go
func (server *Server) Accept(lis net.Listener) {
    for {
        conn, err := lis.Accept()
        if err != nil {
            log.Print("rpc.Serve: accept:", err.Error())
            return
        }
        go server.ServeConn(conn)
    }
}
func (server *Server) ServeCodec(codec ServerCodec) {
    sending := new(sync.Mutex)
    wg := new(sync.WaitGroup)
    for {
        service, mtype, req, argv, replyv, keepReading, err := server.readRequest(codec)
        if err != nil {
            if debugLog && err != io.EOF {
                log.Println("rpc:", err)
            }
            if !keepReading {
                break
            }
            // send a response if we actually managed to read a header.
            if req != nil {
                server.sendResponse(sending, req, invalidRequest, codec, err.Error())
                server.freeRequest(req)
            }
            continue
        }
        wg.Add(1)
        go service.call(server, sending, wg, mtype, req, argv, replyv, codec)
    }
    // We've seen that there are no more requests.
    // Wait for responses to be sent before closing codec.
    wg.Wait()
    codec.Close()
}
```

- Using goroutine to handle clients connections.
- Using goroutine to handle client requests continually from a client connection.

### reflect  

The sever using reflect to registrate the service and method.And using reflect to call the method.

```go
    type service struct {
        name   string                 // name of service
        rcvr   reflect.Value          // receiver of methods for the service
        typ    reflect.Type           // type of the receiver
        method map[string]*methodType // registered methods
    }

    type methodType struct {
        sync.Mutex // protects counters
        method     reflect.Method
        ArgType    reflect.Type
        ReplyType  reflect.Type
        numCalls   uint
    }

    func (s *service) call(server *Server, sending *sync.Mutex, wg *sync.WaitGroup, mtype *methodType, req *Request, argv, replyv reflect.Value, codec ServerCodec) {
        if wg != nil {
            defer wg.Done()
        }
        mtype.Lock()
        mtype.numCalls++
        mtype.Unlock()
        function := mtype.method.Func
        // Invoke the method, providing a new value for the reply.
        returnValues := function.Call([]reflect.Value{s.rcvr, argv, replyv})
        // The return value for the method is an error.
        errInter := returnValues[0].Interface()
        errmsg := ""
        if errInter != nil {
            errmsg = errInter.(error).Error()
        }
        server.sendResponse(sending, req, replyv.Interface(), codec, errmsg)
        server.freeRequest(req)
    }
```


## Reference
https://darjun.github.io/2020/05/08/godailylib/rpc/