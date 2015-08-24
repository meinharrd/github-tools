var GitHubApi = require('github');

var argv = require('minimist')(process.argv.slice(2));

// add String.startsWith()
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

var github = new GitHubApi({
  version: '3.0.0'
});

/**
 * Authentication
 */

if (argv['oauth-token']) {
  github.authenticate({
    type: 'oauth',
    token: argv['oauth-token']
  });
}

/**
 * CLI switches
 */

// Set organization
if (argv._[0] === undefined) {
  usage();
} else {
  var organization = argv._[0];
}

if (argv._[1] == 'list') {
  getOrganizationRepos(listMilestones, null, argv.repos);
} else if (argv._[1] == 'create') {
  if (argv._[2]) {
    var options = {
      title: argv._[2]
    };
    if (argv['description']) {
      options.description = argv['description'];
    }
    if (argv['due-on']) {
      options.due_on = argv['due-on'];
    }
    getOrganizationRepos(createMilestone, options, argv.repos);
  } else {
    usage();
  }
} else if (argv._[1] == 'update') {
  if (argv._[2]) {
    var options = {
      title: argv._[2]
    };
    if (argv['description']) {
      options.description = argv['description'];
    }
    if (argv['due-on']) {
      options.due_on = argv['due-on'];
    }
    if (argv['title']) {
      options.newTitle = argv['title'];
    }
    getOrganizationRepos(updateMilestone, options, argv.repos);
  } else {
    usage();
  }
} else if (argv._[1] == 'delete') {
  if (argv._[2]) {
    getOrganizationRepos(deleteMilestone, {title: argv._[2]}, argv.repos);
  } else {
    usage();
  }
} else {
  usage();
}

/**
 * Helpers
 */

function getOrganizationRepos(callback, options, prefix) {
  if (prefix === undefined || prefix === null) {
    prefix = '';
  }
  github.repos.getFromOrg({
    org: organization
  }, function(err, repos) {
    if (err) {
      console.log(err);
      return;
    }
    var filteredRepos = [];
    repos.forEach(function(repo) {
      if (repo.name.startsWith(prefix)) {
        filteredRepos.push(repo);
      }
    });
    callback(filteredRepos, options);
  });
}

function listMilestones(repos) {
  repos.forEach(function(repo) {
    github.issues.getAllMilestones({
      user: organization,
      repo: repo.name
    }, function(err, milestones) {
      if (err) {
        console.log(err);
        return;
      }
      console.log(repo.full_name + ':');
      milestones.forEach(function(milestone) {
        console.log(' * ' + milestone.title);
        if (milestone.description) {
          console.log('   - Description: ' + milestone.description);
        }
        if (milestone.due_on) {
          console.log('   - Due on: ' + milestone.due_on);
        }
      });
      console.log();
    });
  });
}

function createMilestone(repos, options) {
  repos.forEach(function(repo) {
    var message = {
      user: organization,
      repo: repo.name,
      title: options.title
    };
    if (options.description) {
      message.description = options.description;
    }
    if (options.due_on) {
      message.due_on = options.due_on;
    }
    github.issues.createMilestone(message, function(err, result) {
      if (err) {
        console.log(err);
        return;
      }
      if (result.html_url) {
        console.log(result.html_url + ' created');
      }
    });
  });
}

function updateMilestone(repos, options) {
  repos.forEach(function(repo) {
    github.issues.getAllMilestones({
      user: organization,
      repo: repo.name
    }, function(err, milestones) {
      if (err) {
        console.log(err);
        return;
      }
      milestones.forEach(function(milestone) {
        if (milestone.title == options.title) {
          var message = {
            user: organization,
            repo: repo.name,
            number: milestone.number
          };
          if (options.newTitle) {
            message.title = options.newTitle;
          } else {
            message.title = milestone.title;
          }
          if (options.description) {
            message.description = options.description;
          } else {
            message.description = milestone.description;
          }
          if (options.due_on) {
            message.due_on = options.due_on;
          } else {
            message.due_on = milestone.due_on;
          }
          github.issues.updateMilestone(message, function(err, result) {
            if (err) {
              console.log(err);
            }
            console.log(milestone.html_url + ' updated');
          });
        }
      });
    });
  });
}

function deleteMilestone(repos, options) {
  repos.forEach(function(repo) {
    github.issues.getAllMilestones({
      user: organization,
      repo: repo.name
    }, function(err, milestones) {
      if (err) {
        console.log(err);
        return;
      }
      milestones.forEach(function(milestone) {
        if (milestone.title == options.title) {
          github.issues.deleteMilestone({
            user: organization,
            repo: repo.name,
            number: milestone.number
          }, function(err, result) {
            if (err) {
              console.log(err);
            }
            console.log(milestone.html_url + ' deleted');
          });
        }
      });
    });
  });
}

function usage() {
  console.log(
    'Usage: node milestones.js <organization> <operation> [<arguments>] [<options>]\n' +
    '\n' +
    'Operations can be:\n' +
    '\n' +
    '    list:            List milestones of all repositories\n' +
    '\n' +
    '    create <title>:  Create a milestone on several repositories\n' +
    '        Options:\n' +
    '            --description <text>:        Milestone description\n' +
    '            --due-on <date YYYY-MM-DD>:  Due date\n' +
    '\n' +
    '    update <title>:  Update a milestone on several repositories\n' +
    '        Options:\n' +
    '            --description <text>:        New description\n' +
    '            --due-on <date YYYY-MM-DD>:  New due date\n' +
    '            --title <title>:             New title\n' +
    '\n' +
    '    delete <title>:  Delete a milestone on several repositories\n' +
    '\n' +
    'Global options:\n' +
    '\n' +
    '    --oauth-token <token>:  GitHub personal access token, anonymous if omitted\n' +
    '    --repos <prefix>:       Only include repos starting with <prefix>\n' +
    '\n' +
    'Examples:\n' +
    '\n' +
    '    node milestones.js ExampleOrg create "Public Beta" --repos "beta-" \\ \n' +
    '      --oauth-token your_token\n' +
    ''
  );
  process.exit();
}
