# node-connect-dubbo-test
node 采用 dubbo 协议连接 dubbo 服务端.

## 基本步骤
* java 启动服务端, 在 zookeeper 注册
* node 连接 zookeeper, 获取已经注册的服务, 获取需要的服务端的信息
* node 发起 dubbo 协议的 tcp 连接, 获取调用结果, 完成 rpc 调用

## node 连接 zookeeper
使用 node 连接 zookeeper 注册中心, 并实现对注册中心上的目录的增删改查.
从 dubbo 的具体场景来说, 从注册中心获取到所有的服务端, 然后解析出服务端的 ip 和 port, 就完成了与 zookeeper 的交互.

* 首选的库是 [node-zookeeper-client][node-zookeeper-client], 许多 node 连接 dubbo 的库都在使用该库.
* [yfinkelstein/node-zookeeper](https://github.com/yfinkelstein/node-zookeeper) 没有测试该库.
* [node-zookeeper-dubbo][node-zookeeper-dubbo] 阿里出品, 基于 [node-zookeeper-client][node-zookeeper-client].
* [eggjs/egg-zookeeper](https://github.com/eggjs/egg-zookeeper) eggjs 的 zookeeper 插件, 基于 [node-zookeeper-dubbo][node-zookeeper-dubbo], 没有测试.

总体来说 node 连接 zookeeper 应该挺成熟的, 并且没什么坑.

## node 调用 dubbo 服务端
### 原理
[dubbo 协议][dubbo 协议] 的传输协议是 TCP, 传输方式为 NIO 异步传输 (服务端实现), 默认序列化方式是 hessian2. 所以 node 客户端的通信原理就比较清晰了: node 从 zookeeper 中获取到的服务端的 ip 和 port, 发起一个 TCP 连接, 上传数据为 hessian2 编码的远程 java 方法名称和方法参数， TCP 的返回参数为 hessian2 编码的 java 方法执行结果, 解析一下就可以得到远程方法调用的结果了.

### 关键点
* TCP 连接

NIO 应该是指服务端对 TCP 请求的处理, 客户端不需要维持 TCP 连接, 获取返回后就可以关闭连接. 社区的 TCP 连接库应该挺多的.

* 数据格式的解析

传输数据的序列化方式为 hessian2, node 端的解析和编码库为 [hessian.js][hessian.js].

### 注意点
* 数据类型转换

javascript 的数据类型没有 java 丰富, 所以 node 提交的方法参数是需要申明其对应的 java 数据类型的.
javascript 数据在编码传输时候已经转化为 java 可解析的数据了, 所以转化的方式是由 [hessian.js][hessian.js] 实现.

远程 java 方法的调用结果回调, 返回 node 客户端时候应该是做了默认类型转换.

对 java 的 map / set / enum 等数据结构, 目前还不确定能否直接作为入参或返回.

* 连续性和策略
  * [负载均衡](https://dubbo.gitbooks.io/dubbo-user-book/demos/loadbalance.html)，最简单就给个随机数.
  * [集群容错](https://dubbo.gitbooks.io/dubbo-user-book/demos/fault-tolerent-strategy.html) (失败重试)
  * 服务端列表缓存

dubbo 提供了[多种特性](https://dubbo.gitbooks.io/dubbo-user-book/demos/)， 目前不确定哪些特性对客户端有要求, 有要求并需要该特性, 则需要 node 客户端做相应的实现.

* 开发和测试

开发 java dubbo 客户端时, 引用了远程方法接口, 所以是可以做方法提示和自动补全的, 在 node 开发上目前应该没有这样的体验.

在测试代码时候, dubbo 客户端可以绕过 zookeeper 直接连接提供者, 加快调试, node 开发目前应该没法做到.

## Test
### start zookeeper
```sh
$ docker run --rm --name some-zookeeper -p 2181:2181 zookeeper:3.4.10
```

### start dubbo services
```sh
$ git clone https://github.com/CntChen/dubbo-demo-test.git
$ cd dubbo-demo-provider
$ mvn package && java -Djava.net.preferIPv4Stack=true -jar target/dubbo-demo-provider-2.5.6-jar-with-dependencies.jar
```

### run test
* [node-zookeeper-dubbo](https://github.com/p412726700/node-zookeeper-dubbo)
```
$ node test-nzd.js
{ 'dubbo://10.75.94.35:20880/com.alibaba.dubbo.demo.DemoService?anyhost': 'true',
  application: 'demo-provider',
  dubbo: '2.5.6-jar-with-dependencies',
  generic: 'false',
  group: 'dubbo',
  interface: 'com.alibaba.dubbo.demo.DemoService',
  methods: 'sayHello',
  pid: '67491',
  revision: '2.5.6-jar-with-dependencies',
  side: 'provider',
  timestamp: '1508746857090' }
Dubbo service init done
Hello test, response form provider: 10.75.94.35:20880
```
基于 [node-zookeeper-client][node-zookeeper-client], 可以调用, 有文档, 对不指定 group 的服务端, 无法识别默认 group.

[坑在这里](https://github.com/p412726700/node-zookeeper-dubbo/blob/v2.0/index.js#L98):
`zoo` 在 2.5.6(其他版本没测试) 下不显式指 group 时, 没有 `zoo.group` 字段, 只有 `zoo.defaultGroup` 字段.

* [zookeeper-cluster-client](https://github.com/node-modules/zookeeper-cluster-client)
```bash
$ node test-zcc.js /
$ node test-zcc.js /dubbo/
$ node test-zcc.js /dubbo/com.alibaba.dubbo.demo.DemoService/
$ node test-zcc.js /dubbo/com.alibaba.dubbo.demo.DemoService/providers
Children of /dubbo/com.alibaba.dubbo.demo.DemoService/providers are: ["dubbo%3A%2F%2F192.168.1.6%3A20880%2Fcom.alibaba.dubbo.demo.DemoService%3Fanyhost%3Dtrue%26application%3Ddemo-provider%26dubbo%3D2.5.6-jar-with-dependencies%26generic%3Dfalse%26group%3Ddubbo%26interface%3Dcom.alibaba.dubbo.demo.DemoService%26methods%3DsayHello%26pid%3D60789%26revision%3D2.5.6-jar-with-dependencies%26side%3Dprovider%26timestamp%3D1508693849174"].
```
阿里的人为 [dubbo-js][dubbo-js] 的铺路库, 基于 [node-zookeeper-client][node-zookeeper-client].

* [dubbo-js/dubbo-client](https://github.com/dubbo-js/dubbo-client)

阿里正在做的 node dubbo 客户端, 目前没有文档, 应该还没有达到发布的阶段. 代码比较漂亮, 模块化组织得好. 应该是真正开发的选择.
```
$ node test-dc.js
```
目前测试失败.

## TODO
* 跑通 dubbo-client 的测试

## References
* dubbo 官方文档
> https://dubbo.gitbooks.io/dubbo-user-book/

* 使用node开发dubbo远程调用客户端(dubbo 协议解析讲得比较清楚)
> https://corey600.github.io/2016/08/03/node-dubbo/

[Slient Link]: #
[node-zookeeper-client]: https://github.com/alexguan/node-zookeeper-client
[node-zookeeper-dubbo]: https://github.com/p412726700/node-zookeeper-dubbo
[dubbo-js]: https://github.com/dubbo-js
[dubbo 协议]: https://dubbo.gitbooks.io/dubbo-user-book/references/protocol/dubbo.html
[hessian.js]: https://github.com/node-modules/hessian.js
[js-to-java]: https://github.com/node-modules/js-to-java

## EOF
