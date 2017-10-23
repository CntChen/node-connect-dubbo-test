const zookeeper = require('zookeeper-cluster-client');
const client = zookeeper.createClient('localhost:2181');
const path = process.argv[2];

function listChildren(client, path) {
  client.getChildren(
    path,
    event => {
      console.log('Got watcher event: %s', event);
      listChildren(client, path);
    },
    (err, children, stat) => {
      if (err) {
        console.log('Failed to list children of %s due to: %s.', path, err);
        return;
      }
      console.log('Children of %s are: %j.', path, children);
    }
  );
}

client.once('connected', () => {
  console.log('Connected to ZooKeeper.');
  listChildren(client, path);
});

client.connect();