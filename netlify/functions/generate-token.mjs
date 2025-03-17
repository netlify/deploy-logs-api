export default async (req, context) => {
  console.log(123);
  try {
    const response = await fetch(
      "https://app.netlify.com/access-control/generate-access-control-token",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NETLIFY_ACCESS_CONTROL_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    console.log(data);
    return new Response(JSON.stringify(data));
  } catch (error) {
    console.error(error);
    return new Response("Error generating token", { status: 500 });
  }
};
