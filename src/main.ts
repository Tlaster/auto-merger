import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    const token: string = core.getInput('github_token')
    const octokit = github.getOctokit(token)
    const readyLabel = core.getInput('ready_label')
    const approvedLabel = core.getInput('approved_label')

    // get all pull requests for the repo
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      state: 'open',
    })

    // check if the pull request have the approved and ready labels
    const pullRequestsToMerge = pullRequests.filter((pullRequest) => {
      const labels = pullRequest.labels.map((label) => label.name)
      return labels.includes(readyLabel) && labels.includes(approvedLabel)
    })

    // execute merge for each pull request
    for (const pullRequest of pullRequestsToMerge) {
      // check if the pull request is mergeable
      const { data: pullRequestDetails } = await octokit.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: pullRequest.number,
      })

      if (pullRequestDetails.mergeable) {
        // merge the pull request
        await octokit.rest.pulls.merge({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          pull_number: pullRequest.number,
        })
      }
    }

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
