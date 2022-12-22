import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    const token: string = core.getInput('github_token')
    const octokit = github.getOctokit(token)
    const readyLabel = core.getInput('ready_label')
    const approvedLabel = core.getInput('approved_label')
    let merged = false

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
        // check if all checks are successful
        const { data: checks } = await octokit.rest.checks.listForRef({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          ref: pullRequest.head.ref,
        })

        // if there are no checks, skip the pull request
        if (checks.total_count === 0) continue

        // if there are checks, check if all of them are successful
        const allChecksSuccessful = checks.check_runs.every(
          (check) => check.conclusion === 'success'
        )

        // if not all checks are successful, skip the pull request
        if (!allChecksSuccessful) continue

        // if all checks are successful, merge the pull request
        await octokit.rest.pulls.merge({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          pull_number: pullRequest.number,
        })
        merged = true
      }
    }

    if (merged) {
      core.info('Pull requests merged')
      core.setOutput('merged', 'true')
    } else {
      core.info('No pull requests to merge')
    }

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
