require 'octokit'

client = Octokit::Client.new(access_token: ENV['GITHUB_TOKEN'], auto_paginate: true)
repos = client.org_repos("github").reject(&:archived?).group_by(&:default_branch)
counts = repos.map do |default_branch, repos|
  [default_branch, repos.count]
end;nil
sorted = counts.sort_by do |default_branch, counts|
  counts
end;nil
sorted.each do |branch, count|
  puts [branch, "has", count, "repos"].join(" ")
end;nil
